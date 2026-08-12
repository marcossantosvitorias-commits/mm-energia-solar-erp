import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaToken = Deno.env.get("META_WHATSAPP_TOKEN") ?? Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v23.0";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-client-info, apikey, content-type" } });
  }
  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);
  if (!metaToken) return json({ error: "meta_token_missing" }, 503);

  const url = new URL(req.url);
  const messageId = url.searchParams.get("message_id") ?? "";
  const mediaIdFromQuery = url.searchParams.get("media_id") ?? "";
  let mediaId = mediaIdFromQuery;
  let mime = "application/octet-stream";
  let filename = "arquivo";

  if (messageId) {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("media_id,media_mime_type,media_filename,message_type")
      .eq("id", messageId)
      .maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!data?.media_id) return json({ error: "media_not_found" }, 404);
    mediaId = data.media_id;
    mime = data.media_mime_type || mime;
    filename = data.media_filename || `${data.message_type || "arquivo"}`;
  }

  if (!mediaId) return json({ error: "media_id_required" }, 400);

  const metaInfo = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${metaToken}` },
  });
  const info = await metaInfo.json().catch(() => ({}));
  if (!metaInfo.ok || !info?.url) return json({ error: "meta_media_lookup_failed", details: info }, metaInfo.status || 502);

  const mediaResponse = await fetch(info.url, { headers: { Authorization: `Bearer ${metaToken}` } });
  if (!mediaResponse.ok || !mediaResponse.body) {
    const details = await mediaResponse.text().catch(() => "");
    return json({ error: "meta_media_download_failed", details }, mediaResponse.status || 502);
  }

  const contentType = mediaResponse.headers.get("content-type") || info.mime_type || mime;
  const disposition = contentType.startsWith("image/") || contentType.startsWith("audio/") || contentType.startsWith("video/")
    ? "inline"
    : `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;

  return new Response(mediaResponse.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": disposition,
      "cache-control": "private, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
});
