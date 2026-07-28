-- Acesso comercial às cotações e parâmetros da calculadora Belenus.

-- Cotações: leitura por comercial, financeiro e admin; escrita por financeiro e admin.
drop policy if exists "supplier_quotes_rbac" on public.supplier_quotes;
drop policy if exists "supplier_quotes_read" on public.supplier_quotes;
drop policy if exists "supplier_quotes_write" on public.supplier_quotes;

create policy "supplier_quotes_read"
on public.supplier_quotes for select to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']));

create policy "supplier_quotes_write"
on public.supplier_quotes for all to authenticated
using (public.has_any_role(array['admin','financeiro']))
with check (public.has_any_role(array['admin','financeiro']));

-- Configurações da calculadora: leitura comercial; alteração somente por financeiro e admin.
drop policy if exists "erp_settings_admin_only" on public.erp_settings;
drop policy if exists "erp_settings_read" on public.erp_settings;
drop policy if exists "erp_settings_write" on public.erp_settings;

create policy "erp_settings_read"
on public.erp_settings for select to authenticated
using (
  key = 'belenus_pricing'
  and public.has_any_role(array['admin','financeiro','comercial'])
);

create policy "erp_settings_write"
on public.erp_settings for all to authenticated
using (public.has_any_role(array['admin','financeiro']))
with check (public.has_any_role(array['admin','financeiro']));
