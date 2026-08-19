alter table public.clients
  add column if not exists next_contact_at timestamptz,
  add column if not exists reminder_note text,
  add column if not exists reminder_done boolean not null default false;

create index if not exists clients_next_contact_at_idx
  on public.clients (next_contact_at)
  where next_contact_at is not null and reminder_done = false;

comment on column public.clients.next_contact_at is 'Data e hora do próximo contato comercial com o cliente.';
comment on column public.clients.reminder_note is 'Texto do lembrete comercial a ser exibido na notificação.';
comment on column public.clients.reminder_done is 'Indica se o lembrete de próximo contato já foi concluído.';
