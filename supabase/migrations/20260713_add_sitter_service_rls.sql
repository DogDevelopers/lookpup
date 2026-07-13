-- 시터 등록/편집에 필요한 RLS 정책 추가. sitters/services는 지난 라운드에 SELECT만
-- 추가했고 INSERT/UPDATE 정책이 없어 전체 차단 상태였음.

create policy "sitters_insert_own" on public.sitters
  for insert
  with check (auth.uid() = user_id);

create policy "sitters_update_own" on public.sitters
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "services_insert_own" on public.services
  for insert
  with check (
    exists (
      select 1 from public.sitters s
      where s.id = services.sitter_id
        and s.user_id = auth.uid()
    )
  );

create policy "services_update_own" on public.services
  for update
  using (
    exists (
      select 1 from public.sitters s
      where s.id = services.sitter_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sitters s
      where s.id = services.sitter_id
        and s.user_id = auth.uid()
    )
  );

-- 서비스 insert 실패 시 롤백(삭제)할 수 있도록, 아직 pending(관리자 미승인) 상태인
-- 본인 시터 프로필만 삭제 허용.
create policy "sitters_delete_pending_own" on public.sitters
  for delete
  using (auth.uid() = user_id and status = 'pending');
