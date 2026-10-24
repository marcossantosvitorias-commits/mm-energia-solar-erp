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
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  const text = String(value ?? "").replace(/R\$|\s/gi, "").trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
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
      '{"customer_name":null,"account_holder":null,"consumer_unit":null,"utility_company":null,"concessionaire":null,"reference_month":null,"total_bill":null,"energy_bill_without_fines":null,"energy_consumption_kwh":null,"historical_monthly_bills":[],"historical_monthly_consumption_kwh":[],"history_kind":null,"tariff_per_kwh":0.9,"city":null,"state":null,"connection_type":null,"confidence":"baixa","warnings":[]}',
      "Valores monetários e consumo devem ser números sem símbolo. Extraia o nome completo do TITULAR da conta para customer_name/account_holder e o nome da CONCESSIONÁRIA/DISTRIBUIDORA para utility_company/concessionaire. Leia o histórico de 13 meses. Se houver valores em reais, coloque-os em historical_monthly_bills. Se o histórico mostrar somente consumo, coloque os 13 valores em historical_monthly_consumption_kwh. A calculadora converterá kWh para reais usando a tarifa fixa de R$ 0,90/kWh, somará os 13 meses e calculará a média. Não deixe o histórico vazio se os 13 valores estiverem legíveis. connection_type deve ser monofasica, bifasica, trifasica ou null. state deve ser UF.",
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
    const readHistory = (items: any[]) => items.map((item: any) => finiteNumber(typeof item === "object" ? (item?.value ?? item?.amount ?? item?.bill ?? item?.total ?? item?.kwh) : item));
    const billHistory = Array.isArray(extracted.historical_monthly_bills) ? readHistory(extracted.historical_monthly_bills) : [];
    const consumptionHistory = Array.isArray(extracted.historical_monthly_consumption_kwh) ? readHistory(extracted.historical_monthly_consumption_kwh) : [];
    if (billHistory.length === 13 && billHistory.every((value) => value !== null)) {
      extracted.historical_monthly_bills = billHistory;
      extracted.history_kind = "bill";
    } else if (consumptionHistory.length === 13 && consumptionHistory.every((value) => value !== null)) {
      extracted.historical_monthly_bills = consumptionHistory.map((value) => Number((value * 0.9).toFixed(2)));
      extracted.history_kind = "consumption_converted_to_bill";
    } else extracted.historical_monthly_bills = [];
    extracted.customer_name = extracted.customer_name || extracted.account_holder || extracted.holder_name || null;
    extracted.utility_company = extracted.utility_company || extracted.concessionaire || extracted.distributor || null;
    extracted.tariff_per_kwh = 0.9;
    return json({ ok: true, extracted, model });
  } catch (error) {
    console.error("energy bill analysis failed", error);
    return json({ error: "analysis_failed", message: "Não foi possível analisar a conta agora." }, 500);
  }
});
