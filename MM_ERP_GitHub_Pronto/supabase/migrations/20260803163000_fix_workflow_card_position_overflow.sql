-- A automação das propostas usa o timestamp Unix como posição do card.
-- numeric(12,4) admite apenas oito dígitos inteiros, mas o timestamp atual
-- possui dez. Isso interrompia a criação da proposta com "numeric field overflow".
do $$
begin
  if to_regclass('public.workflow_cards') is not null then
    alter table public.workflow_cards
      alter column position type numeric(16,4)
      using position::numeric(16,4);
  end if;
end
$$;
