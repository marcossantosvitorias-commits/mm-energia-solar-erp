create table if not exists public.bling_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_type text not null default 'Bearer',
  expires_at timestamptz not null,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.bling_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bling_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  local_id text,
  bling_id text,
  operation text not null,
  status text not null check (status in ('pendente','sucesso','erro')),
  message text,
  payload jsonb,
  response jsonb,
  created_at timestamptz not null default now()
);

alter table public.clients add column if not exists bling_id text;
alter table public.clients add column if not exists bling_synced_at timestamptz;
create unique index if not exists clients_bling_id_unique on public.clients(bling_id) where bling_id is not null;

alter table public.bling_connections enable row level security;
alter table public.bling_oauth_states enable row level security;
alter table public.bling_sync_log enable row level security;

-- Tokens and OAuth states are intentionally inaccessible from the browser.
-- Supabase Edge Functions use the service-role key to read and write them.

drop policy if exists "bling_sync_log_select_own" on public.bling_sync_log;
create policy "bling_sync_log_select_own"
on public.bling_sync_log for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create index if not exists bling_sync_log_created_idx on public.bling_sync_log(created_at desc);
create index if not exists bling_oauth_states_expiry_idx on public.bling_oauth_states(expires_at);
