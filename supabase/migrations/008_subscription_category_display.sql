-- Optional reference: category → emoji for clients that choose to display it.
-- Category on subscriptions remains the canonical string key.

create table if not exists public.subscription_category_display (
  category text primary key,
  emoji  text not null
);

alter table public.subscription_category_display enable row level security;

create policy "Anyone can read subscription_category_display"
  on public.subscription_category_display
  for select
  using (true);

insert into public.subscription_category_display (category, emoji) values
  ('Streaming', '📺'),
  ('Music', '🎵'),
  ('Productivity', '💼'),
  ('Cloud Storage', '☁️'),
  ('Gaming', '🎮'),
  ('Fitness', '🏃'),
  ('Education', '📚'),
  ('Utilities', '🔧'),
  ('Other', '📁')
on conflict (category) do update set emoji = excluded.emoji;
