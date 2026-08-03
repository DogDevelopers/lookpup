-- reviews 테이블에 SELECT 정책만 있어 후기 등록/삭제가 RLS에 막혀 있었다.
create policy reviews_insert_own on public.reviews
for insert to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.owner_id = auth.uid()
      and r.status = 'completed'
  )
);

create policy reviews_delete_own on public.reviews
for delete to authenticated
using (auth.uid() = owner_id);

create policy reviews_admin_delete_all on public.reviews
for delete to authenticated
using (is_admin());
