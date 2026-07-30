-- Finalização da instalação em campo: testes, inversor, check-out e relatório técnico.

alter table public.service_orders
  add column if not exists grid_voltage_v numeric,
  add column if not exists inverter_voltage_v numeric,
  add column if not exists inverter_current_a numeric,
  add column if not exists insulation_test_ok boolean,
  add column if not exists grounding_test_ok boolean,
  add column if not exists protection_test_ok boolean,
  add column if not exists inverter_brand text,
  add column if not exists inverter_model text,
  add column if not exists inverter_serial text,
  add column if not exists monitoring_configured boolean,
  add column if not exists monitoring_login text,
  add column if not exists delivery_notes text,
  add column if not exists checkout_at timestamptz,
  add column if not exists checkout_latitude numeric,
  add column if not exists checkout_longitude numeric,
  add column if not exists checkout_accuracy_m numeric,
  add column if not exists technical_report_generated_at timestamptz;

create or replace function public.finalize_service_order_mobile(
  p_service_order_id uuid,
  p_data jsonb,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_m numeric default null
)
returns public.service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.service_orders%rowtype;
  pending_required integer;
  signature_count integer;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;

  select count(*) into pending_required
  from public.service_order_checklist
  where service_order_id = p_service_order_id and required = true and completed = false;
  if pending_required > 0 then raise exception 'Existem % itens obrigatórios pendentes no checklist.', pending_required; end if;

  select count(*) into signature_count
  from public.service_order_signatures
  where service_order_id = p_service_order_id;
  if signature_count = 0 then raise exception 'Colete a assinatura do cliente antes de finalizar.'; end if;

  update public.service_orders set
    grid_voltage_v = nullif(p_data->>'grid_voltage_v','')::numeric,
    inverter_voltage_v = nullif(p_data->>'inverter_voltage_v','')::numeric,
    inverter_current_a = nullif(p_data->>'inverter_current_a','')::numeric,
    insulation_test_ok = coalesce((p_data->>'insulation_test_ok')::boolean, false),
    grounding_test_ok = coalesce((p_data->>'grounding_test_ok')::boolean, false),
    protection_test_ok = coalesce((p_data->>'protection_test_ok')::boolean, false),
    inverter_brand = nullif(p_data->>'inverter_brand',''),
    inverter_model = nullif(p_data->>'inverter_model',''),
    inverter_serial = nullif(p_data->>'inverter_serial',''),
    monitoring_configured = coalesce((p_data->>'monitoring_configured')::boolean, false),
    monitoring_login = nullif(p_data->>'monitoring_login',''),
    delivery_notes = nullif(p_data->>'delivery_notes',''),
    checkout_at = now(),
    checkout_latitude = p_latitude,
    checkout_longitude = p_longitude,
    checkout_accuracy_m = p_accuracy_m,
    technical_report_generated_at = now(),
    completed_at = now(),
    status = 'Concluída',
    updated_at = now()
  where id = p_service_order_id
  returning * into result;

  if result.id is null then raise exception 'Ordem de Serviço não encontrada.'; end if;

  insert into public.service_order_field_events(service_order_id, event_type, event_data, latitude, longitude, accuracy_m, created_by)
  values (p_service_order_id, 'check_out', p_data, p_latitude, p_longitude, p_accuracy_m, auth.uid());

  return result;
end;
$$;

grant execute on function public.finalize_service_order_mobile(uuid, jsonb, numeric, numeric, numeric) to authenticated;