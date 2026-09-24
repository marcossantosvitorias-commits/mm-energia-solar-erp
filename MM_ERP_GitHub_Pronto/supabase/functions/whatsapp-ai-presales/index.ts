import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey=Deno.env.get("OPENAI_API_KEY")||"";
const openaiModel=Deno.env.get("OPENAI_MODEL")||"gpt-5.6";
const metaToken=Deno.env.get("META_WHATSAPP_ACCESS_TOKEN")||"";
const phoneNumberId=Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID")||"370141336173969";
const graphVersion=Deno.env.get("META_GRAPH_VERSION")||"v26.0";
const TEST_PHONE="5514991132372";
const TEST_CUTOFF=new Date("2026-09-17T03:39:00Z").getTime();
const db=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false}});

const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...H,"content-type":"application/json; charset=utf-8"}});
const txt=(v:any)=>typeof v==="string"&&v.trim()?v.trim():null;
const num=(v:any)=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:null};
const bool=(v:any)=>typeof v==="boolean"?v:null;
function outText(r:any){if(typeof r?.output_text==="string")return r.output_text;for(const i of r?.output||[])for(const c of i?.content||[])if(c?.type==="output_text"&&c?.text)return c.text;return ""}
function clean(s:string){return JSON.parse(s.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```$/i,"").trim())}
function norm(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function score(d:any){let x=0;const b=Number(d.estimated_monthly_bill||0);if(b>=700)x+=25;else if(b>=500)x+=20;else if(b>=300)x+=10;if(d.has_existing_proposal===true)x+=25;const t=String(d.installation_timeline||"").toLowerCase();if(/30|agora|imediat|este mês|esse mês/.test(t))x+=15;else if(/60|2 meses|dois meses/.test(t))x+=8;const c=String(d.city||"").toLowerCase();if(/bauru|agudos|pederneiras|lençóis|lencois|piratininga|avaí|avai|arealva|iacanga/.test(c))x+=10;const p=String(d.payment_preference||"").toLowerCase();if(/pix|avista|à vista|cartão|cartao|financi/.test(p))x+=5;if(d.customer_profile)x+=5;return Math.min(100,x)}
function asked(history:string,field:string){const h=norm(history);const map:any={bill:["quanto voce paga","valor da sua conta","conta de energia por mes","media da conta"],city:["qual sua cidade","em qual cidade","cidade voce mora","cidade fica"],property:["imovel e proprio","casa e propria","local e proprio"],profile:["residencial comercial ou rural","local e residencial","perfil residencial"],timeline:["qual prazo","quando pretende instalar","pretende instalar em qual prazo"],payment:["forma de pagamento","avista cartao ou financiamento","pagamento a vista","pensa em pagamento"]};return (map[field]||[]).some((p:string)=>h.includes(norm(p)))}
function nextQ(d:any,history:string){if(d.estimated_monthly_bill==null&&!asked(history,"bill"))return "Qual é o valor médio da sua conta de energia por mês?";if(!d.city&&!asked(history,"city"))return "Em qual cidade será feita a instalação?";if(!d.customer_profile&&!asked(history,"profile"))return "O local é residencial, comercial ou rural?";if(!d.installation_timeline&&!asked(history,"timeline"))return "Você pretende instalar o sistema em qual prazo?";if(!d.payment_preference&&!asked(history,"payment"))return "Você pensa em pagamento à vista, cartão ou financiamento?";return "Perfeito. Tem alguma dúvida específica sobre o sistema ou quer que eu avance com o orçamento?"}
function repeatedQuestion(reply:string,history:string){const r=norm(reply);if(!r.includes("?".replace("?",""))){/* noop */}const prev=history.split("\n").filter(x=>x.startsWith("ASSISTENTE:")).map(x=>norm(x.replace(/^ASSISTENTE:\s*/i,"")));return prev.some(p=>p&&r&&(p===r||p.includes(r)||r.includes(p)))}
function asksKnown(reply:string,d:any){const r=norm(reply);if(d.estimated_monthly_bill!=null&&/(quanto.*paga|valor.*conta|conta.*mes)/.test(r))return true;if(d.city&&/(qual.*cidade|em qual cidade)/.test(r))return true;if(d.customer_profile&&/(residencial.*comercial.*rural)/.test(r))return true;if(d.installation_timeline&&/(qual.*prazo|quando.*instalar)/.test(r))return true;if(d.payment_preference&&/(forma.*pagamento|avista|cartao|financiamento)/.test(r))return true;return false}
async function patch(id:string,p:any){await db.from("whatsapp_conversations").update({...p,updated_at:new Date().toISOString()}).eq("id",id)}
function audioFilename(mime:string|null|undefined){const x=String(mime||"").toLowerCase();if(x.includes("ogg"))return "audio.ogg";if(x.includes("mpeg")||x.includes("mp3"))return "audio.mp3";if(x.includes("mp4")||x.includes("m4a"))return "audio.m4a";if(x.includes("wav"))return "audio.wav";if(x.includes("webm"))return "audio.webm";return "audio.ogg"}
async function transcribeAudioMessage(m:any){
  if(!m?.id||!m?.media_id||m?.body)return m?.body||null;
  try{
    const infoResp=await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(m.media_id)}`,{headers:{Authorization:`Bearer ${metaToken}`}});
    const info=await infoResp.json().catch(()=>({}));
    if(!infoResp.ok||!info?.url)throw new Error("meta_media_lookup_failed");
    const mediaResp=await fetch(info.url,{headers:{Authorization:`Bearer ${metaToken}`}});
    if(!mediaResp.ok)throw new Error("meta_media_download_failed");
    const blob=await mediaResp.blob();
    const mime=mediaResp.headers.get("content-type")||info?.mime_type||m?.media_mime_type||"audio/ogg";
    const form=new FormData();
    form.append("file",new File([blob],audioFilename(mime),{type:mime}));
    form.append("model","gpt-4o-mini-transcribe");
    form.append("language","pt");
    form.append("response_format","json");
    const tr=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${openaiKey}`},body:form});
    const td=await tr.json().catch(()=>({}));
    if(!tr.ok||!String(td?.text||"").trim())throw new Error("transcription_failed");
    const transcript=String(td.text).trim();
    await db.from("whatsapp_messages").update({body:transcript}).eq("id",m.id);
    return transcript;
  }catch(e){
    console.error("audio transcription error",m?.id,e);
    return null;
  }
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 let body:any={};try{body=await req.json()}catch{return json({error:"invalid_json"},400)}
 const id=String(body?.conversation_id||"").trim();if(!id)return json({error:"conversation_id_required"},400);
 await patch(id,{ai_last_attempt_at:new Date().toISOString(),ai_last_error:null});
 const {data:settings}=await db.from("whatsapp_ai_settings").select("*").eq("id",1).single();
 if(!settings?.enabled&&!body?.force){await patch(id,{ai_processing:false});return json({ok:true,skipped:"ai_disabled"})}
 if(!openaiKey){await patch(id,{ai_processing:false,ai_last_error:"openai_key_missing"});return json({error:"openai_key_missing"},503)}
 const {data:conv}=await db.from("whatsapp_conversations").select("*").eq("id",id).single();if(!conv)return json({error:"conversation_not_found"},404);
 const phone=String(conv.phone||"").replace(/\D/g,"");const test=phone===TEST_PHONE;
 if(!test&&!body?.force&&(!conv.ai_enabled||conv.ai_paused||conv.ai_handoff)){await patch(id,{ai_processing:false});return json({ok:true,skipped:"conversation_paused"})}
 const {data:msgs}=await db.from("whatsapp_messages").select("id,direction,sender_type,message_type,body,media_caption,media_id,media_mime_type,occurred_at").eq("conversation_id",id).order("occurred_at",{ascending:false}).limit(30);
 let ordered=(msgs||[]).reverse();if(test)ordered=ordered.filter((m:any)=>new Date(m.occurred_at).getTime()>=TEST_CUTOFF);
 for(const m of ordered){
   if(m.direction==="inbound"&&String(m.message_type||"").toLowerCase()==="audio"&&!m.body&&m.media_id){
     const t=await transcribeAudioMessage(m);
     if(t)m.body=t;
   }
 }
 const history=ordered.map((m:any)=>`${m.direction==="inbound"?"CLIENTE":(m.sender_type==="agent"?"HUMANO":"ASSISTENTE")}: ${m.body||m.media_caption||`[${m.message_type}]`}`).join("\n");
 const latestInbound=[...ordered].reverse().find((m:any)=>m.direction==="inbound");const latestAt=latestInbound?.occurred_at||null;
 if(latestInbound?.message_type==="audio"&&!latestInbound?.body&&!latestInbound?.media_caption){await patch(id,{ai_processing:false,next_action:"Áudio não pôde ser transcrito"});return json({ok:true,skipped:"audio_transcription_failed"})}
 const proposal=!test&&ordered.some((m:any)=>m.direction==="outbound"&&m.sender_type==="agent"&&(String(m.message_type||"").toLowerCase()==="document"||/(segue|enviei|encaminhei|mandei).{0,35}(proposta|orçamento)|proposta.{0,35}(microinversor|inversor|solar)/i.test(String(m.body||m.media_caption||""))));
 const known={city:test?null:conv.city,neighborhood:test?null:conv.neighborhood,estimated_monthly_bill:test?null:conv.estimated_monthly_bill,customer_profile:test?null:conv.customer_profile,property_owned:test?null:conv.property_owned,has_existing_proposal:proposal?true:(test?null:conv.has_existing_proposal),installation_timeline:test?null:conv.installation_timeline,payment_preference:test?null:conv.payment_preference,financing_interest:test?null:conv.financing_interest,qualification_notes:test?null:conv.qualification_notes};
 const isFollowUp=body?.follow_up===true;
 const adContext={headline:conv.meta_ad_headline||null,source_url:conv.meta_ad_source_url||null,ad_id:conv.meta_ad_source_id||null,lead_source:conv.lead_source||null,source:conv.source||null};
 const followCount=Number(conv.follow_up_count||0);
 const followInstruction=isFollowUp
   ? "Esta execução É UM FOLLOW-UP automático. O cliente ainda não respondeu. Não trate como conversa nova e não repita a última pergunta palavra por palavra. Retome de forma humana e curta o assunto pendente. Follow-up atual: "+String(followCount+1)+". No primeiro retorno, seja leve. No segundo, agregue valor e facilite a resposta. No terceiro, faça uma última tentativa educada, sem pressão, urgência falsa ou 'última chance'. Faça no máximo uma pergunta."
   : "Esta execução é uma resposta normal ao cliente, não um follow-up.";
 const prompt=[
 "Você é a assistente comercial da MM Energia Solar no WhatsApp.",
 "",
 "MISSÃO",
 "Atender SOMENTE potenciais clientes (leads comerciais) interessados em comprar/contratar energia solar ou serviços relacionados da MM Energia Solar. Seja inteligente, natural, curta e comercial, usando toda a conversa e sem parecer formulário.",
 "",
 "O QUE É LEAD COMERCIAL",
 "- Pessoa interessada em orçamento, instalação, ampliação, sistema on-grid, híbrido, off-grid, bateria, grid zero, limpeza/manutenção comercial, financiamento ou solução solar.",
 "- Pessoa que chegou por anúncio de energia solar e iniciou conversa, mesmo que ainda tenha escrito apenas uma saudação curta.",
 "- Cliente antigo que demonstra NOVA intenção de compra, ampliação ou contratação de outro serviço.",
 "",
 "NÃO É LEAD COMERCIAL",
 "- Currículo, procura de emprego, vaga, estágio ou pedido para trabalhar na empresa.",
 "- Fornecedor tentando vender produto/serviço para a MM.",
 "- Agência, parceria comercial, publicidade, proposta de marketing ou prospecção B2B dirigida à MM.",
 "- Cobrança, boleto, financeiro, spam, mensagem errada ou assunto sem relação com compra de solução solar.",
 "- Suporte/pós-venda de cliente existente sem intenção de nova compra.",
 "REGRA: se for claramente um desses casos, retorne is_solar_lead=false e reply=\"\".",
 "Se houver dúvida real e NÃO houver contexto de anúncio solar nem intenção comercial, prefira não responder automaticamente: is_solar_lead=false.",
 "Se houver contexto claro de anúncio solar, trate saudação inicial como potencial lead.",
 "",
 "REGRAS DE CONVERSA",
 "- Nunca pergunte se o imóvel é próprio, alugado ou de terceiro e nunca peça autorização do proprietário.",
 "- Nunca repita pergunta ou informação já respondida, inclusive em áudio transcrito.",
 "- Faça no máximo UMA pergunta por mensagem.",
 "- Use o nome quando souber.",
 "- Se já souber cidade, valor da conta, perfil, prazo ou pagamento, não pergunte novamente.",
 "- Não invente preço, geração, economia, desconto, prazo ou aprovação de financiamento.",
 "- Se o cliente fizer uma pergunta objetiva, responda primeiro e depois, se necessário, faça uma única pergunta útil.",
 "- Não transfira cedo demais só porque pediu orçamento; colete o mínimo necessário.",
 "- Se houver pedido explícito de humano, negociação final, visita ou fechamento, marque human_requested=true.",
 "- Se houver forte intenção de fechar/comprar, marque purchase_intent=true.",
 "",
 "QUALIFICAÇÃO PREFERENCIAL",
 "Nome (se desconhecido), valor médio da conta, cidade, residencial/comercial/rural, proposta concorrente, aumento previsto de consumo, prazo de instalação e forma de pagamento. Pule tudo que já estiver respondido.",
 "",
 "FOLLOW-UP",
 followInstruction,
 "",
 "CONFIGURAÇÃO COMERCIAL SALVA:",
 String(settings?.prompt||""),
 String(settings?.company_info?("INFORMAÇÕES DA EMPRESA: "+settings.company_info):""),
 String(settings?.safety_rules?("REGRAS ADICIONAIS: "+settings.safety_rules):""),
 String(settings?.transfer_rules?("TRANSFERÊNCIA: "+settings.transfer_rules):""),
 "",
 "CONTEXTO DO ANÚNCIO/ORIGEM:",
 JSON.stringify(adContext),
 "",
 "Responda SOMENTE JSON válido:",
 "{\"is_solar_lead\":true,\"reply\":\"texto\",\"city\":null,\"neighborhood\":null,\"estimated_monthly_bill\":null,\"customer_profile\":null,\"property_owned\":null,\"has_existing_proposal\":null,\"installation_timeline\":null,\"payment_preference\":null,\"financing_interest\":null,\"qualification_notes\":null,\"human_requested\":false,\"purchase_intent\":false}",
 "Use null quando o dado não estiver explícito. property_owned deve permanecer null porque essa informação não deve ser perguntada nem usada para qualificação.",
 "",
 "DADOS JÁ SALVOS:",
 JSON.stringify(known),
 "",
 "CONVERSA:",
 history
 ].join("\\n");
 const ar=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:openaiModel,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],store:false})});
 const ad=await ar.json().catch(()=>({}));if(!ar.ok){await patch(id,{ai_processing:false,ai_last_error:`openai_failed:${JSON.stringify(ad).slice(0,2000)}`});return json({error:"openai_failed"},ar.status)}
 let p:any;try{p=clean(outText(ad))}catch{await patch(id,{ai_processing:false,ai_last_error:"invalid_ai_output"});return json({error:"invalid_ai_output"},502)}
 const latestText=norm(String(latestInbound?.body||latestInbound?.media_caption||"")); const clearNonLead=/(curriculo|curriculum|vaga|emprego|trabalhar|fornecedor|agencia|marketing|publicidade|parceria|cobranca|boleto|suporte|manutencao.*garantia)/.test(latestText); const cameFromSolarAd=Boolean(adContext.ad_id||conv.meta_ctwa_clid||String(conv.lead_source||"").toLowerCase()==="meta_ad"); if(p.is_solar_lead===false&&cameFromSolarAd&&!clearNonLead){p.is_solar_lead=true; if(!String(p.reply||"").trim()) p.reply=nextQ(known,history);} if(p.is_solar_lead===false&&!test){await patch(id,{ai_is_solar_lead:false,ai_score:0,lead_temperature:"cold",lead_stage:"not_lead",ai_paused:true,ai_handoff:false,follow_up_at:null,ai_last_processed_inbound_at:latestAt,ai_processing:false,ai_last_generated_reply:"",next_action:"Fora do atendimento automático de leads"});return json({ok:true,solar_lead:false,sent:false})}
 const m:any={city:txt(p.city)??known.city,neighborhood:txt(p.neighborhood)??known.neighborhood,estimated_monthly_bill:num(p.estimated_monthly_bill)??known.estimated_monthly_bill,customer_profile:txt(p.customer_profile)??known.customer_profile,property_owned:bool(p.property_owned)??known.property_owned,has_existing_proposal:bool(p.has_existing_proposal)??known.has_existing_proposal,installation_timeline:txt(p.installation_timeline)??known.installation_timeline,payment_preference:txt(p.payment_preference)??known.payment_preference,financing_interest:bool(p.financing_interest)??known.financing_interest,qualification_notes:txt(p.qualification_notes)??known.qualification_notes};
 let reply=String(p.reply||"").trim();
 if(!reply||repeatedQuestion(reply,history)||asksKnown(reply,m))reply=isFollowUp?(followCount<=0?"Oi! Conseguiu ver minha mensagem anterior? Se quiser, continuo seu orçamento por aqui.":followCount===1?"Passando para facilitar seu atendimento: se me responder a informação que ficou pendente, consigo avançar seu orçamento. Posso continuar por aqui?":"Quando quiser retomar seu orçamento de energia solar, pode me chamar por aqui. Posso continuar seu atendimento?"):nextQ(m,history);
 const sc=score(m),hot=Number(settings.min_hot_score||70),warm=Number(settings.min_warm_score||40),temp=sc>=hot?"hot":sc>=warm?"warm":"cold";
 const handoff=test?false:(p.human_requested===true||p.purchase_intent===true||sc>=hot);
 await patch(id,{...m,ai_is_solar_lead:true,ai_score:sc,lead_temperature:temp,lead_stage:handoff?"qualified":"qualifying",ai_handoff:handoff,ai_paused:false,ai_last_reply_at:new Date().toISOString(),ai_last_processed_inbound_at:latestAt,ai_processing:false,ai_last_generated_reply:reply,next_action:handoff?"Assumir atendimento":"Continuar qualificação"});
 const send=test||body?.send===true||(body?.send===undefined&&settings.auto_send===true); 

 // Última trava: se o atendente respondeu durante a geração da IA, não enviar.
 if(send&&!test){
   const { data: gate } = await db.from("whatsapp_conversations")
     .select("ai_enabled,ai_paused,ai_handoff,last_inbound_at")
     .eq("id",id)
     .single();
   const { data: humanReply } = latestAt
     ? await db.from("whatsapp_messages")
         .select("id,occurred_at")
         .eq("conversation_id",id)
         .eq("direction","outbound")
         .eq("sender_type","agent")
         .gt("occurred_at",latestAt)
         .order("occurred_at",{ascending:false})
         .limit(1)
     : { data: [] };
   if(gate?.ai_paused===true||gate?.ai_handoff===true||(humanReply||[]).length){
     await patch(id,{ai_paused:true,ai_handoff:true,ai_processing:false,needs_reply:false,status:"waiting_customer",next_action:"Atendimento humano assumido"});
     return json({ok:true,skipped:"human_takeover"});
   }
 }
 if(send&&reply){const mr=await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,{method:"POST",headers:{Authorization:`Bearer ${metaToken}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:phone,type:"text",text:{preview_url:false,body:reply}})});const md=await mr.json().catch(()=>({}));if(!mr.ok){await patch(id,{ai_last_error:`meta_send_failed:${JSON.stringify(md).slice(0,2000)}`});return json({error:"meta_send_failed",details:md},mr.status)}const ext=md?.messages?.[0]?.id||null;await db.from("whatsapp_messages").insert({conversation_id:id,external_message_id:ext,direction:"outbound",sender_type:"bot",message_type:"text",body:reply,occurred_at:new Date().toISOString(),raw_payload:md,delivery_status:"sent"});await patch(id,{last_outbound_at:new Date().toISOString(),last_message_at:new Date().toISOString(),last_message_preview:reply.slice(0,240),status:handoff?"waiting_team":"waiting_customer",needs_reply:handoff});}
 return json({ok:true,reply,score:sc,temperature:temp,handoff,sent:send,test_auto_reply:test,model:openaiModel});
});