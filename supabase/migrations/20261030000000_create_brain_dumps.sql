create table if not exists public.brain_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  content text not null check (char_length(btrim(content)) > 0),
  category text not null default 'Inbox'
    check (category in ('Inbox', 'Work', 'Personal', 'Study', 'Ideas', 'Other')),
  tags text[] not null default '{}'
    check (cardinality(tags) <= 30),
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  converted_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brain_dumps_owner_updated_idx
  on public.brain_dumps (user_id, updated_at desc);

create index if not exists brain_dumps_owner_pinned_idx
  on public.brain_dumps (user_id, is_pinned desc, updated_at desc)
  where is_archived = false;

create index if not exists brain_dumps_tags_idx
  on public.brain_dumps using gin (tags);

alter table public.brain_dumps enable row level security;

drop policy if exists "Users can read their own brain dumps" on public.brain_dumps;
create policy "Users can read their own brain dumps"
  on public.brain_dumps for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own brain dumps" on public.brain_dumps;
create policy "Users can create their own brain dumps"
  on public.brain_dumps for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own brain dumps" on public.brain_dumps;
create policy "Users can update their own brain dumps"
  on public.brain_dumps for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own brain dumps" on public.brain_dumps;
create policy "Users can delete their own brain dumps"
  on public.brain_dumps for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.brain_dumps to authenticated;

create or replace function public.set_brain_dumps_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brain_dumps_set_updated_at on public.brain_dumps;
create trigger brain_dumps_set_updated_at
  before update on public.brain_dumps
  for each row execute function public.set_brain_dumps_updated_at();
