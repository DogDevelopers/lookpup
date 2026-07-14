-- 게시글(requests) 등록/수정/삭제/조회에 필요한 RLS 정책 추가.
-- requests는 admin select/update만 있고 일반 사용자용 정책이 전혀 없어
-- createRequest insert가 RLS에 막혀 항상 실패하고 있었음.

create policy "requests_select_all" on public.requests
  for select
  using (true);

create policy "requests_insert_own" on public.requests
  for insert
  with check (auth.uid() = owner_id);

create policy "requests_update_own" on public.requests
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "requests_delete_own" on public.requests
  for delete
  using (auth.uid() = owner_id);
