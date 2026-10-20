-- ============================================================
-- 蝴蝶泉 · Supabase 建表脚本
-- 用法：Supabase Dashboard → SQL Editor → New query → 整段粘贴 → Run
-- 可重复执行（全部带 if not exists / 先 drop policy）
-- ============================================================

create table if not exists public.tasks (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  urgency       text not null default 'low',
  importance    text not null default 'low',
  status        text not null default 'todo',
  parent_id     uuid,
  date_type     text default 'none',
  start_date    text,
  end_date      text,
  notes         text,
  recurrence    text,
  recurrence_id text,
  is_trashed    boolean not null default false,
  created_at    bigint,
  updated_at    timestamptz not null default now()
);

-- 常用查询索引
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists tasks_user_parent_idx on public.tasks (user_id, parent_id);
create index if not exists tasks_user_created_idx on public.tasks (user_id, created_at);

-- ---------- 行级安全：每个用户只能碰自己的数据 ----------
alter table public.tasks enable row level security;

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
  on public.tasks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- updated_at 自动维护 ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------- 自检：应当返回 1 行，rls = true ----------
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'tasks') as table_exists,
  (select relrowsecurity from pg_class
     where oid = 'public.tasks'::regclass) as rls_enabled;
