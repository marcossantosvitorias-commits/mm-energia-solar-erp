alter table public.clients
  add column if not exists lead_source text,
  add column if not exists external_provider text,
  add column if not exists external_id text,
  add column if not exists external_payload jsonb not null default '{}'::jsonb;

create unique index if not exists clients_external_provider_id_unique
  on public.clients (external_provider, external_id)
  where external_provider is not null and external_id is not null;

create index if not exists clients_lead_source_idx on public.clients (lead_source);
