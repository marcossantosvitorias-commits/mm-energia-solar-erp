-- Integra a agenda de compromissos ao CRM da MM Energia Solar.

alter table public.appointments
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists appointments_client_idx
on public.appointments(client_id, appointment_at);

drop policy if exists "appointments_authenticated_all" on public.appointments;
drop policy if exists "appointments_commercial_rbac" on public.appointments;
create policy "appointments_commercial_rbac"
on public.appointments for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

comment on column public.appointments.client_id is
  'Cliente do CRM vinculado ao compromisso comercial, quando informado.';
