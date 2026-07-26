-- Execute depois de 20260726000100_initial_erp.sql.
-- Torna o onboarding seguro: somente o primeiro usuário vira administrador.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_role text;
begin
  if exists (select 1 from public.profiles limit 1) then
    initial_role := 'comercial';
  else
    initial_role := 'admin';
  end if;

  insert into public.profiles (id, name, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    initial_role,
    true
  )
  on conflict (id) do update
    set name = excluded.name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Cria perfis que possam existir antes da instalação do trigger.
insert into public.profiles (id, name, role, active)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  case
    when row_number() over (order by u.created_at, u.id) = 1 then 'admin'
    else 'comercial'
  end,
  true
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- Evita erro caso a migration seja executada novamente.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "clients_authenticated_all" on public.clients;
drop policy if exists "suppliers_authenticated_all" on public.suppliers;
drop policy if exists "transactions_authenticated_all" on public.financial_transactions;
drop policy if exists "payable_authenticated_all" on public.accounts_payable;
drop policy if exists "receivable_authenticated_all" on public.accounts_receivable;
drop policy if exists "imports_authenticated_all" on public.data_imports;
drop policy if exists "belcred_authenticated_all" on public.belcred_simulations;

create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self_or_admin"
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "clients_authenticated_all"
on public.clients for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy "suppliers_authenticated_all"
on public.suppliers for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy "transactions_authenticated_all"
on public.financial_transactions for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy "payable_authenticated_all"
on public.accounts_payable for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy "receivable_authenticated_all"
on public.accounts_receivable for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy "imports_authenticated_all"
on public.data_imports for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());

create policy "belcred_authenticated_all"
on public.belcred_simulations for all to authenticated
using (public.is_active_user())
with check (public.is_active_user());
