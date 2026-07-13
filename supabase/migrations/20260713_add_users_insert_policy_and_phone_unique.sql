-- users 테이블에 INSERT 정책 추가 (본인인증 콜백에서 최초 로그인 시 본인 row 생성 허용)
create policy "users_insert_own" on public.users
  for insert
  with check (auth.uid() = id);

-- 소프트 삭제되지 않은 유저 간 전화번호 중복 가입 방지 (본인인증 결과 반영 시 활용)
create unique index users_phone_number_unique
  on public.users (phone_number)
  where deleted_at is null;
