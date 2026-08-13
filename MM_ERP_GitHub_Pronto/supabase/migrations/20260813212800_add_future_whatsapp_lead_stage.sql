alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_lead_stage_check;

alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_lead_stage_check
  check (
    lead_stage = any (
      array[
        'new'::text,
        'qualifying'::text,
        'qualified'::text,
        'proposal'::text,
        'follow_up'::text,
        'future'::text,
        'won'::text,
        'lost'::text,
        'not_lead'::text
      ]
    )
  );
