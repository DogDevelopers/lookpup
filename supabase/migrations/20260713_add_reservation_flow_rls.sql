-- 예약 생성/조회/취소 플로우에 필요한 RLS 정책 추가.
-- sitters/services/reservation_items는 정책이 아예 없어 전체 차단 상태였고,
-- reservations는 SELECT만 있고 INSERT/UPDATE가 없었음.

create policy "sitters_select_public" on public.sitters
  for select
  using (status = 'approved');

create policy "sitters_select_own" on public.sitters
  for select
  using (auth.uid() = user_id);

create policy "services_select_public" on public.services
  for select
  using (is_active = true);

create policy "reservations_insert_own" on public.reservations
  for insert
  with check (auth.uid() = owner_id);

create policy "reservations_update_own" on public.reservations
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "reservation_items_select_participant" on public.reservation_items
  for select
  using (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_items.reservation_id
        and (
          r.owner_id = auth.uid()
          or r.sitter_id in (select id from public.sitters where user_id = auth.uid())
        )
    )
  );

create policy "reservation_items_insert_own" on public.reservation_items
  for insert
  with check (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_items.reservation_id
        and r.owner_id = auth.uid()
    )
  );

-- 예약 생성 도중 reservation_items insert가 실패했을 때 롤백(삭제)할 수 있도록,
-- 아직 pending 상태인 본인 예약만 삭제 허용.
create policy "reservations_delete_pending_own" on public.reservations
  for delete
  using (auth.uid() = owner_id and status = 'pending');
