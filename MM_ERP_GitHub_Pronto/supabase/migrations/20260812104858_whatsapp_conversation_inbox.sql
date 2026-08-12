create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  external_conversation_id text,
  phone text not null,
  contact_name text,
  source text not null default 'whatsapp',
  status text not null default 'open' check (status in ('open','waiting_customer','waiting_team','closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer not null default 0,
  needs_reply boolean not null default false,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  external_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  sender_type text not null default 'customer' check (sender_type in ('customer','bot','agent','system')),
  message_type text not null default 'text',
  body text,
  occurred_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (external_message_id)
);

create index if not exists whatsapp_conversations_needs_reply_idx on public.whatsapp_conversations (needs_reply, last_inbound_at desc);
create index if not exists whatsapp_messages_conversation_time_idx on public.whatsapp_messages (conversation_id, occurred_at desc);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy "authenticated read whatsapp conversations"
on public.whatsapp_conversations for select to authenticated
using ((select auth.uid()) is not null);

create policy "authenticated update whatsapp conversations"
on public.whatsapp_conversations for update to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy "authenticated read whatsapp messages"
on public.whatsapp_messages for select to authenticated
using ((select auth.uid()) is not null);

create or replace view public.whatsapp_pending_replies
with (security_invoker = true)
as
select c.*, extract(epoch from (now() - c.last_inbound_at))/3600.0 as waiting_hours
from public.whatsapp_conversations c
where c.needs_reply = true
order by case c.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end, c.last_inbound_at asc;

grant select on public.whatsapp_conversations, public.whatsapp_messages, public.whatsapp_pending_replies to authenticated;
grant update on public.whatsapp_conversations to authenticated;
