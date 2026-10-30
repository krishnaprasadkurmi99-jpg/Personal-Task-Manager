create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  working_start_time time not null,
  working_end_time time not null,
  energy_level text not null check (energy_level in ('Low', 'Balanced', 'High')),
  break_interval_minutes integer not null check (break_interval_minutes between 30 and 240),
  break_duration_minutes integer not null check (break_duration_minutes between 5 and 45),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_plans_working_hours_check check (working_end_time > working_start_time),
  constraint daily_plans_user_date_unique unique (user_id, plan_date)
);

create index if not exists daily_plans_owner_date_idx
  on public.daily_plans (user_id, plan_date desc);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text,
  task_title text,
  planned_duration_minutes integer not null check (planned_duration_minutes between 1 and 240),
  actual_duration_minutes integer not null check (actual_duration_minutes between 0 and 1440),
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('completed', 'interrupted')),
  created_at timestamptz not null default now(),
  constraint focus_sessions_completed_at_check check (
    (status = 'completed' and completed_at is not null and actual_duration_minutes > 0)
    or (status = 'interrupted' and actual_duration_minutes >= 0)
  )
);

create index if not exists focus_sessions_owner_started_idx
  on public.focus_sessions (user_id, started_at desc);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '',
  category text not null check (category in ('Health', 'Mindfulness', 'Learning', 'Personal', 'Other')),
  days_of_week smallint[] not null default array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    check (
      cardinality(days_of_week) between 1 and 7
      and array_position(days_of_week, null) is null
      and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    ),
  reminder_time time,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_id_owner_unique unique (id, user_id)
);

create index if not exists habits_owner_updated_idx
  on public.habits (user_id, updated_at desc);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null,
  log_date date not null,
  completed_at timestamptz,
  constraint habit_logs_habit_owner_fk
    foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade,
  constraint habit_logs_habit_date_unique unique (habit_id, log_date)
);

create index if not exists habit_logs_owner_date_idx
  on public.habit_logs (user_id, log_date desc);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '',
  category text not null check (category in ('Personal', 'Career', 'Health', 'Learning', 'Finance', 'Other')),
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_id_owner_unique unique (id, user_id)
);

create index if not exists goals_owner_updated_idx
  on public.goals (user_id, status, target_date);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint milestones_goal_owner_fk
    foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade,
  constraint milestones_completion_timestamp_check check (
    (is_completed and completed_at is not null) or (not is_completed and completed_at is null)
  )
);

create index if not exists milestones_goal_created_idx
  on public.milestones (goal_id, created_at);

create table if not exists public.productivity_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  wins text not null default '',
  challenges text not null default '',
  priorities text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint productivity_reviews_user_week_unique unique (user_id, week_start),
  constraint productivity_reviews_monday_check check (extract(isodow from week_start) = 1)
);

create index if not exists productivity_reviews_owner_week_idx
  on public.productivity_reviews (user_id, week_start desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  working_start_time time not null default '09:00',
  working_end_time time not null default '17:00',
  energy_level text not null default 'Balanced' check (energy_level in ('Low', 'Balanced', 'High')),
  break_interval_minutes integer not null default 90 check (break_interval_minutes between 30 and 240),
  break_duration_minutes integer not null default 10 check (break_duration_minutes between 5 and 45),
  focus_duration_minutes integer not null default 25 check (focus_duration_minutes between 1 and 240),
  short_break_minutes integer not null default 5 check (short_break_minutes between 1 and 60),
  long_break_minutes integer not null default 15 check (long_break_minutes between 1 and 90),
  long_break_interval integer not null default 4 check (long_break_interval between 2 and 12),
  updated_at timestamptz not null default now(),
  constraint user_settings_working_hours_check check (working_end_time > working_start_time)
);

create table if not exists public.task_completion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  task_title text not null check (char_length(btrim(task_title)) > 0),
  category text not null,
  priority text not null,
  completed_at timestamptz not null default now()
);

create index if not exists task_completion_events_owner_completed_idx
  on public.task_completion_events (user_id, completed_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'daily_plans',
    'focus_sessions',
    'habits',
    'habit_logs',
    'goals',
    'milestones',
    'productivity_reviews',
    'task_completion_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_owner_all',
      table_name
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end
$$;

alter table public.user_settings enable row level security;
drop policy if exists "user_settings_owner_all" on public.user_settings;
create policy "user_settings_owner_all" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.user_settings to authenticated;

create or replace function public.set_productivity_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['daily_plans', 'habits', 'goals', 'productivity_reviews', 'user_settings']
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_productivity_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end
$$;
