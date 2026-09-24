alter table public.whatsapp_ai_settings
  add column if not exists pause_on_human_reply boolean not null default true;

update public.whatsapp_ai_settings
set pause_on_human_reply = true, updated_at = now()
where id = 1;

create or replace function public.pause_whatsapp_ai_on_human_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.direction = 'outbound' and NEW.sender_type = 'agent'
     and exists (
       select 1 from public.whatsapp_ai_settings
       where id = 1 and pause_on_human_reply = true
     )
  then
    update public.whatsapp_conversations
    set ai_paused = true,
        ai_handoff = true,
        needs_reply = false,
        status = 'waiting_customer',
        next_action = 'Atendimento humano assumido',
        updated_at = now()
    where id = NEW.conversation_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_pause_whatsapp_ai_on_human_reply
on public.whatsapp_messages;

create trigger trg_pause_whatsapp_ai_on_human_reply
after insert on public.whatsapp_messages
for each row
execute function public.pause_whatsapp_ai_on_human_reply();
