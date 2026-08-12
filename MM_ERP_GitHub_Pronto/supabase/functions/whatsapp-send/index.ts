import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaToken = Deno.env.get("META_WHATSAPP_TOKEN") ?? Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID") ?? Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v23.0";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-client-info, apikey, content-type" } });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);
  if (!metaToken || !phoneNumberId) return json({ error: "meta_token_missing" }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const conversationId = String(body?.conversation_id ?? "").trim();
  const text = String(body?.body ?? "").trim();
  if (!conversationId || !text) return json({ error: "conversation_id_and_body_required" }, 400);

  const { data: conversation, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select("id,phone,contact_name")
    .eq("id", conversationId)
    .maybeSingle();
  if (convError) return json({ error: convError.message }, 400);
  if (!conversation?.phone) return json({ error: "conversation_not_found" }, 404);

  const metaResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${metaToken}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: conversation.phone, type: "text", text: { body: text, preview_url: false } }),
  });
  const meta = await metaResponse.json().catch(() => ({}));
  if (!metaResponse.ok) return json({ error: "meta_send_failed", details: meta }, metaResponse.status || 502);

  const externalMessageId = meta?.messages?.[0]?.id ?? null;
  const occurredAt = new Date().toISOString();
  const { error: msgError } = await supabase.from("whatsapp_messages").upsert({
    conversation_id: conversation.id,
    external_message_id: externalMessageId,
    direction: "outbound",
    sender_type: "agent",
    message_type: "text",
    body: text,
    occurred_at: occurredAt,
    raw_payload: { source: "erp", meta_response: meta, user_id: user.id },
  }, { onConflict: "external_message_id", ignoreDuplicates: true });
  if (msgError) return json({ error: msgError.message }, 500);

  await supabase.from("whatsapp_conversations").update({
    needs_reply: false,
    status: "waiting_customer",
    unread_count: 0,
    last_outbound_at: occurredAt,
    last_message_at: occurredAt,
    last_message_preview: text.slice(0, 240),
    updated_at: occurredAt,
  }).eq("id", conversation.id);

  return json({ ok: true, external_message_id: externalMessageId });
});
