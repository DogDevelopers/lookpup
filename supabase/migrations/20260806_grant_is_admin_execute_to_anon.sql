-- 익명 사용자의 게시글 상세 조회가 실패하던 문제를 수정한다.
--
-- 20260714_add_admin_rls_policies.sql에서 anon의 is_admin() 실행 권한을 회수했는데,
-- 관리자 정책(sitters_admin_select_all 등)이 걸린 테이블을 익명으로 조회하면
-- 정책 평가 중 42501 permission denied for function is_admin 이 발생해 쿼리 전체가 실패한다.
-- sitters의 나머지 정책(status = 'approved')은 상수가 아니라 단축 평가되지 않는다.
--
-- 실제 증상: 비로그인 상태에서 /board/[id]가 applications -> sitters 조인 때문에
-- 항상 "게시글을 찾을 수 없습니다"로 표시됐다.
--
-- is_admin()은 SECURITY DEFINER이고 auth.uid()가 null인 익명 세션에서는 항상 false를
-- 반환하므로, 실행 권한을 줘도 노출되는 정보는 없다.

grant execute on function public.is_admin() to anon;
