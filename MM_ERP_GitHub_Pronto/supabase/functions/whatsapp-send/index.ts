import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || "";
const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID") || "370141336173969";
const graphVersion = Deno.env.get("META_GRAPH_VERSION") || "v26.0";

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!auth) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: allowed, error: roleError } = await userClient.rpc("has_any_role", { allowed_roles: ["admin", "financeiro", "comercial"] });
  if (roleError || allowed !== true) return json({ error: "forbidden" }, 403);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user?.id) return json({ error: "unauthorized" }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const conversationId = String(payload?.conversation_id || "").trim();
  const body = String(payload?.body || "").trim();
  if (!conversationId || !body) return json({ error: "conversation_id_and_body_required" }, 400);
  if (body.length > 4096) return json({ error: "message_too_long" }, 400);
  if (!metaToken) return json({ error: "meta_token_missing", message: "Configure META_WHATSAPP_ACCESS_TOKEN no Supabase." }, 503);

  const { data: conversation, error: convError } = await admin.from("whatsapp_conversations").select("id,phone,contact_name").eq("id", conversationId).single();
  if (convError || !conversation?.phone) return json({ error: "conversation_not_found" }, 404);

  const to = String(conversation.phone).replace(/\D/g, "");
  const metaResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
  });

  const metaData = await metaResponse.json().catch(() => ({}));
  if (!metaResponse.ok) return json({ error: "meta_send_failed", details: metaData }, metaResponse.status);

  const externalMessageId = metaData?.messages?.[0]?.id || null;
  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    external_message_id: externalMessageId,
    direction: "outbound",
    sender_type: "agent",
    message_type: "text",
    body,
    occurred_at: now,
    raw_payload: metaData,
    sent_by: userData.user.id,
    delivery_status: "sent",
  });
  if (insertError) return json({ error: "message_saved_with_error", details: insertError.message }, 500);

  await admin.from("whatsapp_conversations").update({
    needs_reply: false,
    status: "waiting_customer",
    unread_count: 0,
    last_outbound_at: now,
    last_message_at: now,
    last_message_preview: body.slice(0, 240),
    updated_at: now,
  }).eq("id", conversation.id);

  return json({ ok: true, message_id: externalMessageId });
});
