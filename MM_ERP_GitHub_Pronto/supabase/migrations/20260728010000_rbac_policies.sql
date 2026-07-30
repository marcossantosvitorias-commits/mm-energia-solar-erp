-- Controle de acesso por perfil para os módulos sensíveis do MM ERP.
-- Esta migration substitui somente políticas permissivas; migrations anteriores permanecem intactas.

create or replace function public.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role = any(allowed_roles)
  );
$$;

create or replace function public.can_access_financial_scope(record_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_any_role(array['admin'])
    or (
      coalesce(record_scope, 'company') = 'company'
      and public.has_any_role(array['financeiro'])
    );
$$;

-- Financeiro empresarial: admin vê todos os escopos; financeiro vê somente empresa.
drop policy if exists "transactions_authenticated_all" on public.financial_transactions;
drop policy if exists "transactions_rbac" on public.financial_transactions;
create policy "transactions_rbac"
on public.financial_transactions for all to authenticated
using (public.can_access_financial_scope(scope))
with check (public.can_access_financial_scope(scope));

drop policy if exists "payable_authenticated_all" on public.accounts_payable;
drop policy if exists "payable_rbac" on public.accounts_payable;
create policy "payable_rbac"
on public.accounts_payable for all to authenticated
using (public.can_access_financial_scope(scope))
with check (public.can_access_financial_scope(scope));

drop policy if exists "receivable_authenticated_all" on public.accounts_receivable;
drop policy if exists "receivable_rbac" on public.accounts_receivable;
create policy "receivable_rbac"
on public.accounts_receivable for all to authenticated
using (public.can_access_financial_scope(scope))
with check (public.can_access_financial_scope(scope));

-- Contratos e propostas: equipe comercial, financeiro e administração.
drop policy if exists "contracts_authenticated_all" on public.contracts;
drop policy if exists "contracts_rbac" on public.contracts;
create policy "contracts_rbac"
on public.contracts for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

drop policy if exists "client_proposals_authenticated_all" on public.client_proposals;
drop policy if exists "client_proposals_rbac" on public.client_proposals;
create policy "client_proposals_rbac"
on public.client_proposals for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

drop policy if exists "supplier_quotes_authenticated_all" on public.supplier_quotes;
drop policy if exists "supplier_quotes_rbac" on public.supplier_quotes;
create policy "supplier_quotes_rbac"
on public.supplier_quotes for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

-- Configurações e importações podem afetar todo o ERP: somente administradores.
drop policy if exists "erp_settings_authenticated_all" on public.erp_settings;
drop policy if exists "erp_settings_admin_only" on public.erp_settings;
create policy "erp_settings_admin_only"
on public.erp_settings for all to authenticated
using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

drop policy if exists "imports_authenticated_all" on public.data_imports;
drop policy if exists "imports_admin_only" on public.data_imports;
create policy "imports_admin_only"
on public.data_imports for all to authenticated
using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

-- Simulações BelCred acompanham o fluxo comercial.
drop policy if exists "belcred_authenticated_all" on public.belcred_simulations;
drop policy if exists "belcred_rbac" on public.belcred_simulations;
create policy "belcred_rbac"
on public.belcred_simulations for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

comment on function public.has_any_role(text[]) is
  'Retorna verdadeiro quando o usuário autenticado está ativo e possui um dos perfis permitidos.';
comment on function public.can_access_financial_scope(text) is
  'Admin acessa dados financeiros empresariais e pessoais; financeiro acessa somente o escopo company.';
