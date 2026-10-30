-- MUSELOG 계정 기록 보관함 (F-010)
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run을 한 번 누른다. 여러 번 실행해도 괜찮다.

-- 사람마다 한 줄: 기록 묶음(백업 파일과 같은 형식)과 마지막 저장 시각
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 보안 규칙: 로그인한 사람은 자기 줄만 읽고, 만들고, 고칠 수 있다
alter table public.user_data enable row level security;

drop policy if exists "user_data: read own" on public.user_data;
create policy "user_data: read own" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "user_data: insert own" on public.user_data;
create policy "user_data: insert own" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "user_data: update own" on public.user_data;
create policy "user_data: update own" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 저장 시각은 서버 시계로 정한다 (기기마다 시계가 달라도 어느 쪽이 새것인지 바르게 비교)
create or replace function public.user_data_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_set_updated_at on public.user_data;
create trigger user_data_set_updated_at
  before insert or update on public.user_data
  for each row execute function public.user_data_set_updated_at();
