create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-erp-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'erp_project_url') || '/functions/v1/send-erp-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'erp_anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  ) as request_id;
  $$
);
