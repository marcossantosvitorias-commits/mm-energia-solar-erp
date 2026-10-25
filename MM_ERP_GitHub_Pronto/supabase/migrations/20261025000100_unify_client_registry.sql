create or replace function public.upsert_client_contact(
  p_name text,
  p_phone text,
  p_email text default null,
  p_city text default null,
  p_state text default 'SP',
  p_monthly_bill numeric default 0,
  p_source text default 'site'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\\D', '', 'g');
  v_email text := lower(nullif(trim(coalesce(p_email, '')), ''));
begin
  if coalesce(trim(p_name), '') = '' or length(v_phone) < 10 then
    raise exception 'Nome e telefone válidos são obrigatórios';
  end if;

  select * into v_client
  from public.clients
  where regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = v_phone
     or (v_email is not null and lower(coalesce(email, '')) = v_email)
  order by updated_at desc
  limit 1;

  if v_client.id is null then
    insert into public.clients(name, phone, email, city, state, status, monthly_bill, lead_source)
    values (trim(p_name), trim(p_phone), v_email, nullif(trim(p_city), ''), coalesce(nullif(trim(p_state), ''), 'SP'), 'lead', greatest(coalesce(p_monthly_bill, 0), 0), coalesce(nullif(trim(p_source), ''), 'site'))
    returning * into v_client;
  else
    update public.clients
    set name = coalesce(nullif(trim(p_name), ''), name),
        phone = coalesce(nullif(trim(p_phone), ''), phone),
        email = coalesce(v_email, email),
        city = coalesce(nullif(trim(p_city), ''), city),
        state = coalesce(nullif(trim(p_state), ''), state),
        monthly_bill = case when coalesce(p_monthly_bill, 0) > 0 then p_monthly_bill else monthly_bill end,
        lead_source = coalesce(nullif(trim(p_source), ''), lead_source),
        updated_at = now()
    where id = v_client.id
    returning * into v_client;
  end if;

  return v_client.id;
end;
$$;

grant execute on function public.upsert_client_contact(text, text, text, text, text, numeric, text) to anon, authenticated;
