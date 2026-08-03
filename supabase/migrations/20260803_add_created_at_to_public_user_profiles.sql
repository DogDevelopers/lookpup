-- 게시판 상세의 "작성자 정보" 카드가 가입일을 표시한다.
-- users.created_at도 RLS에 막히므로 공개 프로필 함수 반환에 추가한다.
drop function if exists public.get_public_user_profiles(uuid[]);

create function public.get_public_user_profiles(user_ids uuid[])
returns table(id uuid, full_name text, profile_image text, is_verified boolean, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.full_name, u.profile_image, u.is_verified, u.created_at
  from public.users u
  where u.id = any(user_ids) and u.deleted_at is null;
$$;

grant execute on function public.get_public_user_profiles(uuid[]) to anon, authenticated;
