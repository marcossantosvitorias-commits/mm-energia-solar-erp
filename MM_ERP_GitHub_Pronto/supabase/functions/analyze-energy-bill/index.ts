import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
const model = Deno.env.get("OPENAI_BILL_MODEL") || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...headers, "content-type": "application/json; charset=utf-8" },
});

function outputText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) return content.text;
    }
  }
  return "";
}

function parseJson(value: string) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function validUnitTariff(value: unknown) {
  const number = finiteNumber(value);
  return number !== null && number >= 0.05 && number <= 1.5 ? number : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!openaiKey) return json({ error: "openai_key_missing" }, 503);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const data = String(body?.data_base64 || "").trim();
  const mime = String(body?.mime_type || "").toLowerCase();
  const filename = String(body?.file_name || "conta-de-energia").slice(0, 120);
  if (!data || !(mime.startsWith("image/") || mime === "application/pdf")) {
    return json({ error: "unsupported_file", message: "Envie uma imagem ou PDF da conta de energia." }, 400);
  }
  if (data.length > 14_000_000) return json({ error: "file_too_large", message: "A conta excede o limite de análise." }, 413);

  const dataUrl = `data:${mime};base64,${data}`;
  const content: any[] = [{
    type: "input_text",
    text: [
      "Analise esta conta de energia elétrica brasileira para uma calculadora de energia solar.",
      "Extraia somente dados que estejam legíveis. Não invente valores. Se um campo não estiver claro, use null e inclua um aviso.",
      "Remova multas, juros, doações e cobranças não relacionadas ao consumo ao estimar o valor de energia, mas preserve o total da fatura em total_bill.",
      "Responda SOMENTE JSON válido com exatamente estas chaves:",
      '{"customer_name":null,"consumer_unit":null,"utility_company":null,"reference_month":null,"total_bill":null,"energy_bill_without_fines":null,"energy_consumption_kwh":null,"te_per_kwh":null,"tusd_per_kwh":null,"tariff_per_kwh":null,"city":null,"state":null,"connection_type":null,"confidence":"baixa","warnings":[]}',
      "Valores monetários e consumo devem ser números sem símbolo. Extraia TE e TUSD SOMENTE do campo de tarifa unitária em R$/kWh (não use o valor total cobrado da linha). A tarifa final tariff_per_kwh deve ser TE + TUSD e normalmente fica entre 0,50 e 1,50 R$/kWh; se os valores estiverem em outra unidade ou fora dessa faixa, use null e avise. connection_type deve ser monofasica, bifasica, trifasica ou null. state deve ser UF.",
      `Arquivo: ${filename}`,
    ].join("\n"),
  }];
  content.push(mime === "application/pdf"
    ? { type: "input_file", filename, file_data: dataUrl }
    : { type: "input_image", image_url: dataUrl, detail: "high" });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: [{ role: "user", content }], store: false }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: "ai_provider_failed", detail: payload?.error?.message || "Falha no provedor de IA." }, 502);
    let extracted: any;
    try { extracted = parseJson(outputText(payload)); } catch { return json({ error: "invalid_ai_output", message: "A IA não retornou dados estruturados." }, 502); }
    const te = validUnitTariff(extracted.te_per_kwh);
    const tusd = validUnitTariff(extracted.tusd_per_kwh);
    const extractedTariff = validUnitTariff(extracted.tariff_per_kwh);
    if (te !== null && tusd !== null && te + tusd <= 1.5) extracted.tariff_per_kwh = Number((te + tusd).toFixed(6));
    else if (extractedTariff === null) {
      extracted.tariff_per_kwh = null;
      extracted.warnings = [...(Array.isArray(extracted.warnings) ? extracted.warnings : []), "Tarifa unitária TE + TUSD não identificada com segurança; confira o campo Tarifa."];
    }
    return json({ ok: true, extracted, model });
  } catch (error) {
    console.error("energy bill analysis failed", error);
    return json({ error: "analysis_failed", message: "Não foi possível analisar a conta agora." }, 500);
  }
});
