-- ============================================================
-- Disable the old daily cron job (replaced by event-driven approach)
-- ============================================================
select cron.unschedule('send-push-reminders');

-- ============================================================
-- Event-driven push reminders
-- When a subscription is created or its charge date / reminder
-- settings change, schedule (or reschedule) a one-shot cron job
-- that fires the send-single-reminder Edge Function at the
-- exact reminder time.
-- ============================================================

-- 1. Helper: schedule (or reschedule) a reminder for one subscription
create or replace function public.schedule_subscription_reminder()
returns trigger as $$
declare
  job_name     text;
  remind_date  date;
  remind_hour  int;
  remind_min   int;
  cron_expr    text;
begin
  -- If reminders are disabled or subscription is not active, just clean up
  if not new.reminder_enabled or new.status not in ('active', 'trial') then
    begin
      perform cron.unschedule('reminder_' || new.id::text);
    exception when others then
      null;
    end;
    return new;
  end if;

  job_name := 'reminder_' || new.id::text;

  -- Calculate the reminder date
  remind_date := new.next_charge_date - (coalesce(new.reminder_days_before, 1));

  -- Skip if reminder date is in the past
  if remind_date < current_date then
    return new;
  end if;

  -- Parse reminder_time (format: 'HH:MM')
  remind_hour := split_part(coalesce(new.reminder_time, '09:00'), ':', 1)::int;
  remind_min  := split_part(coalesce(new.reminder_time, '09:00'), ':', 2)::int;

  -- Remove existing job if any (reschedule scenario)
  begin
    perform cron.unschedule(job_name);
  exception when others then
    null;
  end;

  -- Build one-shot cron expression: minute hour day month *
  cron_expr := remind_min || ' ' || remind_hour || ' ' ||
               extract(day from remind_date)::int || ' ' ||
               extract(month from remind_date)::int || ' *';

  -- Schedule the one-shot cron job
  perform cron.schedule(
    job_name,
    cron_expr,
    format(
      $cron$select net.http_post(
        url := 'https://wwlbrmlshwgxchibtjhp.supabase.co/functions/v1/send-single-reminder',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{"subscription_id":"%s"}'::jsonb
      )$cron$,
      new.id::text
    )
  );

  return new;
end;
$$ language plpgsql security definer;

-- 2. Trigger on INSERT and relevant UPDATEs
create trigger schedule_reminder_on_change
  after insert or update of next_charge_date, reminder_days_before,
    reminder_time, reminder_enabled, status
  on public.subscriptions
  for each row
  execute function public.schedule_subscription_reminder();

-- 3. Auto-cleanup: function to unschedule reminder when subscription is deleted
create or replace function public.unschedule_subscription_reminder()
returns trigger as $$
begin
  begin
    perform cron.unschedule('reminder_' || old.id::text);
  exception when others then
    null;
  end;
  return old;
end;
$$ language plpgsql security definer;

create trigger unschedule_reminder_on_delete
  before delete on public.subscriptions
  for each row
  execute function public.unschedule_subscription_reminder();

-- 4. RPC for Edge Function self-cleanup of one-shot cron jobs
create or replace function public.unschedule_reminder_job(job_name text)
returns void as $$
begin
  perform cron.unschedule(job_name);
exception when others then
  null;
end;
$$ language plpgsql security definer;
