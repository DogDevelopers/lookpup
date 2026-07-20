-- notifications 테이블에 UPDATE 정책이 없어 읽음 처리(is_read)가 RLS에 막혀 항상 0행 갱신됨.
-- 본인 알림만 UPDATE 가능하도록 정책 추가.

create policy "notifications_update_own" on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
