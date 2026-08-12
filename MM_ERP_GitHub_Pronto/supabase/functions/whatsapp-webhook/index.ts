import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function normalizePhone(value: unknown) { return String(value ?? "").replace(/\D/g, ""); }
function firstText(...values: unknown[]) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validToken(supplied: string) {
  if (!supplied) return false;
  const { data, error } = await supabase.schema("private").from("webhook_secrets").select("secret_hash").eq("key", "whatsapp_webhook").maybeSingle();
  if (error || !data?.secret_hash) return false;
  return (await sha256(supplied)) === data.secret_hash;
}

function detectSenderType(payload: any, direction: "inbound" | "outbound") {
  const raw = firstText(payload.sender_type, payload.senderType, payload.author_type, payload.authorType, payload.user_type, payload.userType, payload.message?.sender_type, payload.message?.senderType).toLowerCase();
  if (["agent", "human", "user", "staff", "attendant", "owner", "atendente"].includes(raw)) return "agent";
  if (["bot", "automation", "ai", "chatbot", "workflow", "automacao", "ia"].includes(raw)) return "bot";
  return direction === "inbound" ? "customer" : "bot";
}

function mediaFromGeneric(msg: any, payload: any, messageType: string) {
  const candidate = msg?.[messageType] ?? payload?.[messageType] ?? msg?.media ?? payload?.media ?? {};
  return {
    mediaId: firstText(candidate?.id, msg.media_id, msg.mediaId, payload.media_id, payload.mediaId),
    mediaUrl: firstText(candidate?.url, candidate?.link, msg.media_url, msg.mediaUrl, payload.media_url, payload.mediaUrl),
    mediaMimeType: firstText(candidate?.mime_type, candidate?.mimeType, msg.mime_type, msg.mimeType, payload.mime_type, payload.mimeType),
    mediaFilename: firstText(candidate?.filename, candidate?.file_name, candidate?.name, msg.filename, payload.filename),
    mediaCaption: firstText(candidate?.caption, msg.caption, payload.caption),
  };
}

function normalizeGeneric(payload: any) {
  const msg = payload.message ?? payload.data?.message ?? payload.data ?? payload;
  const rawDirection = firstText(msg.direction, payload.direction, msg.message_direction, payload.message_direction).toLowerCase();
  const direction: "inbound" | "outbound" = ["outbound", "outgoing", "sent", "from_me", "fromme", "saida"].includes(rawDirection) || msg.fromMe === true ? "outbound" : "inbound";
  const phone = normalizePhone(msg.phone ?? msg.contact_phone ?? msg.wa_id ?? msg.from ?? msg.to ?? payload.phone ?? payload.contact?.phone ?? payload.contact?.wa_id ?? payload.wa_id);
  const messageType = firstText(msg.type, payload.message_type, payload.messageType) || "text";
  const media = mediaFromGeneric(msg, payload, messageType);
  const body = firstText(msg.body, msg.text, msg.message, msg.content, msg.text?.body, media.mediaCaption, payload.body, payload.text);
  const occurred = msg.timestamp ?? msg.created_at ?? msg.createdAt ?? payload.timestamp ?? payload.created_at;
  let occurredAt = new Date().toISOString();
  if (occurred) {
    const n = Number(occurred);
    const d = Number.isFinite(n) && String(occurred).length <= 13 ? new Date(String(occurred).length <= 10 ? n * 1000 : n) : new Date(occurred);
    if (!Number.isNaN(d.getTime())) occurredAt = d.toISOString();
  }
  return [{
    externalConversationId: firstText(payload.conversation_id, payload.conversationId, msg.conversation_id, msg.conversationId),
    externalMessageId: firstText(msg.id, msg.message_id, msg.messageId, payload.message_id, payload.messageId), phone,
    contactName: firstText(payload.contact?.name, payload.name, msg.contact_name, msg.contactName), direction,
    senderType: detectSenderType(payload, direction), messageType,
    body, occurredAt, source: firstText(payload.source, payload.provider, payload.platform) || "whatsapp_agency", raw: payload,
    ...media,
  }];
}

function metaMedia(msg: any) {
  const type = String(msg?.type ?? "text");
  const media = msg?.[type] ?? {};
  return {
    mediaId: firstText(media?.id),
    mediaUrl: "",
    mediaMimeType: firstText(media?.mime_type),
    mediaFilename: firstText(media?.filename),
    mediaCaption: firstText(media?.caption),
  };
}

function normalizeMeta(payload: any) {
  const out: any[] = [];
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    const value = change.value ?? {};
    const contacts = new Map((value.contacts ?? []).map((c: any) => [c.wa_id, c]));
    for (const msg of value.messages ?? []) {
      const c: any = contacts.get(msg.from);
      const media = metaMedia(msg);
      out.push({
        externalConversationId: msg.from,
        externalMessageId: msg.id,
        phone: normalizePhone(msg.from),
        contactName: firstText(c?.profile?.name),
        direction: "inbound",
        senderType: "customer",
        messageType: msg.type ?? "text",
        body: firstText(msg.text?.body, msg.button?.text, msg.interactive?.button_reply?.title, msg.interactive?.list_reply?.title, media.mediaCaption),
        occurredAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
        source: "meta_cloud_api",
        raw: payload,
        ...media,
      });
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token") ?? "";
    if (challenge && await validToken(verifyToken)) return new Response(challenge, { status: 200 });
    if (challenge) return json({ error: "unauthorized" }, 401);
    return json({ ok: true, service: "whatsapp-webhook" });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supplied = req.headers.get("x-webhook-token") ?? url.searchParams.get("token") ?? "";
  if (!(await validToken(supplied))) return json({ error: "unauthorized" }, 401);
  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const items = payload?.object === "whatsapp_business_account" ? normalizeMeta(payload) : normalizeGeneric(payload);
  const processed: any[] = [];
  for (const item of items) {
    if (!item.phone) continue;
    const { data: existing } = await supabase.from("whatsapp_conversations").select("*").eq("phone", item.phone).maybeSingle();
    const inbound = item.direction === "inbound";
    const humanOutbound = item.direction === "outbound" && item.senderType === "agent";
    const needsReply = inbound ? true : humanOutbound ? false : (existing?.needs_reply ?? false);
    const status = needsReply ? "waiting_team" : humanOutbound ? "waiting_customer" : (existing?.status ?? "open");
    const preview = item.body?.slice(0, 240) || (item.messageType !== "text" ? `[${item.messageType}]` : "") || existing?.last_message_preview || null;
    const conversationPatch: any = { phone: item.phone, contact_name: item.contactName || existing?.contact_name || null, external_conversation_id: item.externalConversationId || existing?.external_conversation_id || null, source: item.source, status, needs_reply: needsReply, last_message_at: item.occurredAt, last_message_preview: preview, updated_at: new Date().toISOString() };
    if (inbound) { conversationPatch.last_inbound_at = item.occurredAt; conversationPatch.unread_count = (existing?.unread_count ?? 0) + 1; }
    if (item.direction === "outbound") { conversationPatch.last_outbound_at = item.occurredAt; if (humanOutbound) conversationPatch.unread_count = 0; }
    const { data: conversation, error: convError } = await supabase.from("whatsapp_conversations").upsert(conversationPatch, { onConflict: "phone" }).select("id").single();
    if (convError) { processed.push({ phone: item.phone, ok: false, error: convError.message }); continue; }
    const messageRow = {
      conversation_id: conversation.id,
      external_message_id: item.externalMessageId || null,
      direction: item.direction,
      sender_type: item.senderType,
      message_type: item.messageType,
      body: item.body || null,
      media_id: item.mediaId || null,
      media_url: item.mediaUrl || null,
      media_mime_type: item.mediaMimeType || null,
      media_filename: item.mediaFilename || null,
      media_caption: item.mediaCaption || null,
      occurred_at: item.occurredAt,
      raw_payload: item.raw,
    };
    const { error: msgError } = await supabase.from("whatsapp_messages").upsert(messageRow, { onConflict: "external_message_id", ignoreDuplicates: true });
    processed.push({ phone: item.phone, ok: !msgError, error: msgError?.message });
  }
  return json({ ok: true, processed });
});
