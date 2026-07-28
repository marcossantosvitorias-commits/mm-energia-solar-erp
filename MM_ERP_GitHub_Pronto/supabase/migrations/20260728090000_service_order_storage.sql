-- Armazenamento privado das fotos das Ordens de Serviço.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-orders',
  'service-orders',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "service_order_files_read" on storage.objects;
create policy "service_order_files_read"
on storage.objects for select to authenticated
using (bucket_id = 'service-orders' and public.is_active_user());

drop policy if exists "service_order_files_insert" on storage.objects;
create policy "service_order_files_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'service-orders' and public.is_active_user());

drop policy if exists "service_order_files_update" on storage.objects;
create policy "service_order_files_update"
on storage.objects for update to authenticated
using (bucket_id = 'service-orders' and public.is_active_user())
with check (bucket_id = 'service-orders' and public.is_active_user());

drop policy if exists "service_order_files_delete" on storage.objects;
create policy "service_order_files_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'service-orders' and public.is_active_user());
