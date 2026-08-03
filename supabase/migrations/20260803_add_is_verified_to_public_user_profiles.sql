-- users의 SELECT 정책은 users_select_own(auth.uid() = id)뿐이라,
-- 예약 조회 시 상대방(시터/보호자)의 users 행이 중첩 조인에서 RLS로 걸러진다.
-- users에 광범위 SELECT 정책을 여는 대신(phone_number·address 등이 함께 노출됨)
-- 기존 공개 프로필 함수에 인증 배지용 is_verified만 추가한다.
drop function if exists public.get_public_user_profiles(uuid[]);

create function public.get_public_user_profiles(user_ids uuid[])
returns table(id uuid, full_name text, profile_image text, is_verified boolean)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.full_name, u.profile_image, u.is_verified
  from public.users u
  where u.id = any(user_ids) and u.deleted_at is null;
$$;

-- 시터 상세의 후기 목록이 비로그인에서도 보이므로 anon 실행 권한을 유지한다.
grant execute on function public.get_public_user_profiles(uuid[]) to anon, authenticated;
