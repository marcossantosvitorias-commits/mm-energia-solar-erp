-- Taxas de cartão usadas na formação de preço da MM Energia Solar.

create table if not exists public.card_fee_schedules (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  installments integer not null check (installments between 1 and 36),
  fee_percent numeric(7,4) not null default 0 check (fee_percent >= 0 and fee_percent < 100),
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, installments)
);

alter table public.card_fee_schedules enable row level security;

drop policy if exists "card_fees_commercial_read" on public.card_fee_schedules;
create policy "card_fees_commercial_read"
on public.card_fee_schedules for select to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']));

drop policy if exists "card_fees_financial_write" on public.card_fee_schedules;
create policy "card_fees_financial_write"
on public.card_fee_schedules for all to authenticated
using (public.has_any_role(array['admin','financeiro']))
with check (public.has_any_role(array['admin','financeiro']));

drop trigger if exists card_fee_schedules_updated_at on public.card_fee_schedules;
create trigger card_fee_schedules_updated_at
before update on public.card_fee_schedules
for each row execute procedure public.set_updated_at();

insert into public.card_fee_schedules (provider, installments, fee_percent, active, notes)
values
  ('My Gateway', 1, 4.39, true, 'Crédito à vista'),
  ('My Gateway', 2, 6.09, true, null),
  ('My Gateway', 3, 6.65, true, null),
  ('My Gateway', 4, 7.15, true, null),
  ('My Gateway', 5, 7.69, true, null),
  ('My Gateway', 6, 8.19, true, null),
  ('My Gateway', 7, 9.09, true, null),
  ('My Gateway', 8, 9.69, true, null),
  ('My Gateway', 9, 10.25, true, null),
  ('My Gateway', 10, 10.79, true, null),
  ('My Gateway', 11, 11.39, true, null),
  ('My Gateway', 12, 11.69, true, null),
  ('My Gateway', 13, 12.55, true, null),
  ('My Gateway', 14, 12.99, true, null),
  ('My Gateway', 15, 13.69, true, null),
  ('My Gateway', 16, 14.29, true, null),
  ('My Gateway', 17, 14.85, true, null),
  ('My Gateway', 18, 15.49, true, null),
  ('My Gateway', 19, 16.39, true, null),
  ('My Gateway', 20, 17.39, true, null),
  ('My Gateway', 21, 18.28, true, null)
on conflict (provider, installments) do update
set fee_percent = excluded.fee_percent,
    active = excluded.active,
    notes = excluded.notes;
