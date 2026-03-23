-- ============================================================
-- Subscriptions table
-- ============================================================
create table public.subscriptions (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade not null,
  service_name    text        not null,
  domain          text,
  category        text        not null default 'Other',
  price           numeric     not null,
  currency        text        not null default 'USD',
  billing_cycle   text        not null default 'monthly',
  custom_cycle_days integer,
  subscription_start_date date not null,
  next_charge_date date       not null,
  description     text,
  url             text,
  payment_method  text,
  list            text        not null default 'Personal',
  status          text        not null default 'active',
  is_trial        boolean     not null default false,
  reminder_enabled    boolean not null default true,
  reminder_days_before integer not null default 1,
  reminder_time   text        not null default '09:00',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions"
  on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions"
  on public.subscriptions for update using (auth.uid() = user_id);
create policy "Users can delete own subscriptions"
  on public.subscriptions for delete using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- Enable realtime for subscriptions
alter publication supabase_realtime add table public.subscriptions;

-- ============================================================
-- User preferences (sort / filter)
-- ============================================================
create table public.user_preferences (
  user_id    uuid references auth.users(id) on delete cascade primary key,
  sort       text not null default 'nearest_renewal',
  filter     text not null default 'all',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view own preferences"
  on public.user_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own preferences"
  on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own preferences"
  on public.user_preferences for update using (auth.uid() = user_id);

-- ============================================================
-- Device push tokens
-- ============================================================
create table public.device_tokens (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  token      text not null,
  platform   text not null default 'ios',
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

alter table public.device_tokens enable row level security;

create policy "Users can view own tokens"
  on public.device_tokens for select using (auth.uid() = user_id);
create policy "Users can insert own tokens"
  on public.device_tokens for insert with check (auth.uid() = user_id);
create policy "Users can delete own tokens"
  on public.device_tokens for delete using (auth.uid() = user_id);
