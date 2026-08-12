alter table public.whatsapp_messages
  add column if not exists media_id text,
  add column if not exists media_url text,
  add column if not exists media_mime_type text,
  add column if not exists media_filename text,
  add column if not exists media_caption text;

create index if not exists whatsapp_messages_media_id_idx
  on public.whatsapp_messages (media_id)
  where media_id is not null;
