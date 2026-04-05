-- Persist explicit trial length (days) when is_trial is true.
-- Previously inferred from subscription_start_date vs next_charge_date only.
alter table public.subscriptions
  add column if not exists trial_length_days integer;

comment on column public.subscriptions.trial_length_days is
  'When is_trial is true, user-selected trial duration in days; null when not a trial or legacy row.';
