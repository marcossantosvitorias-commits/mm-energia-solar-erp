-- Persistência completa dos contratos e clientes sincronizados do Autentique.

alter table public.contracts add column if not exists client_phone text;
alter table public.contracts add column if not exists client_email text;
alter table public.contracts add column if not exists autentique_id text;
alter table public.contracts add column if not exists signer_public_id text;
alter table public.contracts add column if not exists signing_url text;
alter table public.contracts add column if not exists original_file_url text;
alter table public.contracts add column if not exists signed_file_url text;
alter table public.contracts add column if not exists viewed_at timestamptz;
alter table public.contracts add column if not exists rejected_at timestamptz;
alter table public.contracts add column if not exists signed_at timestamptz;
alter table public.contracts add column if not exists synced_at timestamptz;
alter table public.contracts add column if not exists source text not null default 'ERP';
alter table public.contracts add column if not exists raw_data jsonb not null default '{}'::jsonb;

create unique index if not exists contracts_autentique_id_uidx
  on public.contracts(autentique_id)
  where autentique_id is not null;

create index if not exists contracts_client_phone_idx on public.contracts(client_phone);
create index if not exists contracts_client_email_idx on public.contracts(lower(client_email));
create index if not exists contracts_status_updated_idx on public.contracts(status, updated_at desc);

alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('rascunho','enviado','visualizado','assinado','recusado','expirado','concluido','cancelado'));

-- Facilita a deduplicação de clientes sem bloquear cadastros antigos incompletos.
create unique index if not exists clients_document_unique_nonempty
  on public.clients(document)
  where document is not null and btrim(document) <> '';

create index if not exists clients_phone_lookup_idx on public.clients(phone);
create index if not exists clients_email_lookup_idx on public.clients(lower(email));
