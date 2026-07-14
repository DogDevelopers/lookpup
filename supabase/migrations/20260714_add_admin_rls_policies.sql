-- 관리자(role='admin')가 신고/예약/펫시터신청/서비스/구인글/유저 전체에 접근할 수 있도록
-- RLS 정책을 추가한다. 서비스 롤 클라이언트 대신 세션 클라이언트 + RLS로 처리하기 위함.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- reports: 정책이 전혀 없어 현재 아무도 접근 불가 -> 관리자 전체 조회/처리 정책만 추가
create policy reports_admin_select_all on public.reports
  for select using (is_admin());
create policy reports_admin_update_all on public.reports
  for update using (is_admin()) with check (is_admin());

-- reservations: 기존엔 본인(owner/sitter) 것만 조회 가능, 관리자 전체 조회/상태변경 추가
create policy reservations_admin_select_all on public.reservations
  for select using (is_admin());
create policy reservations_admin_update_all on public.reservations
  for update using (is_admin()) with check (is_admin());

-- sitters: 기존엔 본인 것 또는 approved만 조회 가능(pending 등은 관리자만 봐야 함), 승인/반려 포함
create policy sitters_admin_select_all on public.sitters
  for select using (is_admin());
create policy sitters_admin_update_all on public.sitters
  for update using (is_admin()) with check (is_admin());

-- services: 관리자의 서비스 비활성화용
create policy services_admin_update_all on public.services
  for update using (is_admin()) with check (is_admin());

-- requests: 정책이 전혀 없어 현재 아무도 접근 불가 -> 관리자의 구인글 취소 처리용 최소 정책만 추가
create policy requests_admin_select_all on public.requests
  for select using (is_admin());
create policy requests_admin_update_all on public.requests
  for update using (is_admin()) with check (is_admin());

-- users: 관리자가 신고자/보호자/시터 정보를 조인해서 보고, 정지/강등 처리
create policy users_admin_select_all on public.users
  for select using (is_admin());
create policy users_admin_update_all on public.users
  for update using (is_admin()) with check (is_admin());
