alter table public.workflow_cards
  alter column position type numeric(16,4)
  using position::numeric(16,4);
