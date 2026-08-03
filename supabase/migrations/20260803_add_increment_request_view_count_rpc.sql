-- requests의 UPDATE 정책은 requests_update_own(auth.uid() = owner_id) 뿐이라
-- 글을 열람한 다른 사용자가 조회수를 올릴 수 없다. view_count 한 컬럼만
-- 증가시키는 security definer 함수로 우회한다 (search_reportable_users와 동일 패턴).
create or replace function public.increment_request_view_count(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.requests
  set view_count = view_count + 1
  where id = p_id;
$$;

-- 비로그인 방문자의 조회도 집계하므로 anon에도 실행 권한을 준다.
revoke execute on function public.increment_request_view_count(uuid) from public;
grant execute on function public.increment_request_view_count(uuid) to anon, authenticated;
