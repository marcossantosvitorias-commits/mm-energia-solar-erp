create schema if not exists private;

create table if not exists private.webhook_secrets (
  key text primary key,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

delete from public.erp_settings where key = 'whatsapp_webhook_token';

drop policy if exists "authenticated read whatsapp conversations" on public.whatsapp_conversations;
drop policy if exists "authenticated update whatsapp conversations" on public.whatsapp_conversations;
drop policy if exists "authenticated read whatsapp messages" on public.whatsapp_messages;

create policy "whatsapp conversations rbac read"
on public.whatsapp_conversations for select
to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']));

create policy "whatsapp conversations rbac update"
on public.whatsapp_conversations for update
to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

create policy "whatsapp messages rbac read"
on public.whatsapp_messages for select
to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']));

-- O hash do token real é provisionado no ambiente Supabase e não fica versionado no GitHub.
