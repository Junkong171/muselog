-- MUSELOG 회원 탈퇴 (F-014)
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run을 한 번 누른다. 여러 번 실행해도 괜찮다.

-- 로그인한 사람이 "자기 계정만" 지운다. 앱(브라우저)은 계정을 직접 지울 권한이 없어서,
-- 이 함수가 서버 권한(security definer)으로 auth.uid() 본인 줄만 지운다.
-- user_data 줄은 표를 만들 때 정한 on delete cascade 때문에 함께 지워진다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception '로그인하지 않았어요';
  end if;
  delete from auth.users where id = me;
end;
$$;

-- 로그인한 사람만 부를 수 있다 (로그인하지 않은 방문자·누구나 권한은 회수)
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
