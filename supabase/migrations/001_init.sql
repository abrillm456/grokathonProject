-- LIFE//RIVAL schema
-- Apply in the Supabase SQL editor. Demo Mode does not require this file.
-- Server routes use the service role for match finalization. The browser only
-- receives the anon key, and only when NEXT_PUBLIC_DATA_MODE=supabase.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null unique,
  residential_college text,
  graduation_year int,
  avatar_url text,
  initials text,
  avatar_hue int default 200,
  matchmaking_rating int not null default 1000,
  lifetime_xp int not null default 0,
  current_win_streak int not null default 0,
  longest_win_streak int not null default 0,
  total_wins int not null default 0,
  total_losses int not null default 0,
  is_demo_rival boolean not null default false,
  share_activity_summaries boolean not null default true,
  notifications_enabled boolean not null default true,
  challenge_notifications boolean not null default true,
  leaderboard_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wellness_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  academic_weight int not null,
  fitness_weight int not null,
  social_weight int not null,
  exploration_weight int not null,
  recovery_weight int not null,
  academic_goal numeric not null,
  fitness_goal numeric not null,
  social_goal numeric not null,
  exploration_goal numeric not null,
  recovery_goal numeric not null,
  effective_week_start date not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_week_start),
  constraint weights_total check (
    academic_weight + fitness_weight + social_weight + exploration_weight + recovery_weight = 100
  )
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  activity_type text not null,
  amount numeric not null check (amount > 0),
  unit text not null,
  activity_date timestamptz not null,
  notes text,
  proof_url text,
  self_reported boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_matches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  player_one_id uuid not null references public.profiles (id),
  player_two_id uuid not null references public.profiles (id),
  player_one_xp int,
  player_two_xp int,
  winner_id uuid references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'finalized')),
  compatibility_score numeric,
  is_practice_match boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  check (player_one_id <> player_two_id)
);

create unique index if not exists weekly_matches_player_one_week
  on public.weekly_matches (week_start, player_one_id);
create unique index if not exists weekly_matches_player_two_week
  on public.weekly_matches (week_start, player_two_id);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.weekly_matches (id) on delete cascade,
  creator_id uuid not null references public.profiles (id),
  recipient_id uuid not null references public.profiles (id),
  title text not null,
  description text,
  category text not null,
  target_amount numeric not null,
  target_unit text not null,
  bonus_xp int not null default 25,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  accepted_at timestamptz,
  declined_at timestamptz,
  completed_at timestamptz,
  progress_amount numeric not null default 0,
  bonus_awarded boolean not null default false,
  unique (challenge_id, user_id)
);

create table if not exists public.weekly_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  academic_xp numeric not null default 0,
  fitness_xp numeric not null default 0,
  social_xp numeric not null default 0,
  exploration_xp numeric not null default 0,
  recovery_xp numeric not null default 0,
  challenge_xp int not null default 0,
  total_xp int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.weekly_matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id),
  result text not null check (result in ('win', 'loss', 'tie')),
  xp_earned int not null,
  rating_before int not null,
  rating_after int not null,
  streak_after int not null,
  counts_for_leaderboard boolean not null default true,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index if not exists activities_user_date_idx on public.activities (user_id, activity_date);
create index if not exists matches_week_idx on public.weekly_matches (week_start);
create index if not exists results_user_idx on public.match_results (user_id, created_at);

alter table public.profiles enable row level security;
alter table public.wellness_preferences enable row level security;
alter table public.activities enable row level security;
alter table public.weekly_matches enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.weekly_scores enable row level security;
alter table public.coach_messages enable row level security;
alter table public.match_results enable row level security;

-- Leaderboard fields are visible to signed-in students. Private notes are not.
create policy "profiles are visible to signed-in users"
  on public.profiles for select to authenticated using (true);
create policy "users update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "own preferences"
  on public.wellness_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own activities"
  on public.activities for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "see your matches"
  on public.weekly_matches for select to authenticated
  using (auth.uid() = player_one_id or auth.uid() = player_two_id);

create policy "see challenges on your matches"
  on public.challenges for select to authenticated
  using (
    exists (
      select 1 from public.weekly_matches m
      where m.id = match_id and (m.player_one_id = auth.uid() or m.player_two_id = auth.uid())
    )
  );

create policy "own challenge participation"
  on public.challenge_participants for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scores"
  on public.weekly_scores for select to authenticated using (auth.uid() = user_id);

create policy "own coach messages"
  on public.coach_messages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own match results"
  on public.match_results for select to authenticated using (auth.uid() = user_id);

-- Finalization, rating changes, and streak updates belong to the service role,
-- which bypasses RLS. Do not grant those writes to the anon or authenticated roles.
