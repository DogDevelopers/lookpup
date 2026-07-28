-- 본인이 신고를 접수할 수 있도록 (지금까지 reports엔 관리자 전용 정책만 있었음)
create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());

-- 신고 대상 검색용 — users 테이블 전체를 노출하는 광범위 SELECT 정책 대신
-- 필요한 컬럼만 반환하는 함수로 제한 (get_public_user_profiles와 동일 패턴).
create or replace function public.search_reportable_users(p_query text)
returns table(id uuid, full_name text, profile_image text, role text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.full_name, u.profile_image, u.role
  from public.users u
  where u.full_name ilike '%' || p_query || '%'
    and u.id <> auth.uid()
    and u.deleted_at is null
  limit 10;
$$;

revoke execute on function public.search_reportable_users(text) from public;
revoke execute on function public.search_reportable_users(text) from anon;
grant execute on function public.search_reportable_users(text) to authenticated;
