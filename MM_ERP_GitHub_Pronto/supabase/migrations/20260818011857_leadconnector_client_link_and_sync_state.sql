alter table public.crm_leadconnector_sync
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists imported_at timestamptz,
  add column if not exists sync_error text;

create unique index if not exists crm_leadconnector_sync_contact_unique
  on public.crm_leadconnector_sync (provider, location_id, external_contact_id)
  where external_contact_id is not null;

create index if not exists crm_leadconnector_sync_client_idx
  on public.crm_leadconnector_sync (client_id);

comment on column public.crm_leadconnector_sync.client_id is 'Cliente correspondente no CRM interno da MM Energia Solar.';
comment on column public.crm_leadconnector_sync.imported_at is 'Data da última importação bem-sucedida para clients.';
