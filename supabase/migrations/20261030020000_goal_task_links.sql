create table if not exists public.goal_task_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  task_id text not null,
  created_at timestamptz not null default now(),
  constraint goal_task_links_goal_owner_fk
    foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade,
  constraint goal_task_links_goal_task_unique unique (goal_id, task_id)
);

create index if not exists goal_task_links_owner_goal_idx
  on public.goal_task_links (user_id, goal_id);

alter table public.goal_task_links enable row level security;
drop policy if exists "goal_task_links_owner_all" on public.goal_task_links;
create policy "goal_task_links_owner_all" on public.goal_task_links
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.goal_task_links to authenticated;
