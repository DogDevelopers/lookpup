-- pets 테이블에 폼이 이미 요구하던 중성화 여부 컬럼 추가
alter table public.pets add column neutered boolean not null default false;

-- pets 테이블에 RLS가 켜져있는데 정책이 하나도 없어 본인 row도 접근 불가능했음 — 본인 소유 CRUD 허용
create policy "pets_select_own" on public.pets
  for select
  using (auth.uid() = owner_id);

create policy "pets_insert_own" on public.pets
  for insert
  with check (auth.uid() = owner_id);

create policy "pets_update_own" on public.pets
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
