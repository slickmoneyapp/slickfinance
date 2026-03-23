-- Enable pg_cron and pg_net extensions (needed for scheduled edge function calls)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Schedule daily push reminder check at 08:00 UTC
-- Calls the send-reminders Edge Function which checks upcoming charges
-- and sends push notifications via Expo Push API
select cron.schedule(
  'send-push-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://wwlbrmlshwgxchibtjhp.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
