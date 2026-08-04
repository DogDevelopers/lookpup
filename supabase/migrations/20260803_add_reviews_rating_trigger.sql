-- 후기 등록/삭제 시 sitters.rating이 반영되지 않던 버그 수정.
-- 서버 액션에서 owner 세션으로 sitters.update를 호출했으나
-- sitters_update_own RLS(auth.uid() = user_id)에 막혀 조용히 실패하고 있었음.
-- reviews 변경 시 DB 트리거(SECURITY DEFINER)가 sitters.rating을 재계산하도록 이전.
create or replace function recalc_sitter_rating() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_sitter_id uuid;
  avg_rating numeric;
begin
  target_sitter_id := coalesce(new.sitter_id, old.sitter_id);

  select round(avg(rating)::numeric, 1) into avg_rating
  from reviews
  where sitter_id = target_sitter_id;

  update sitters
  set rating = coalesce(avg_rating, 0)
  where id = target_sitter_id;

  return null;
end;
$$;

drop trigger if exists reviews_recalc_sitter_rating on reviews;
create trigger reviews_recalc_sitter_rating
after insert or update or delete on reviews
for each row execute function recalc_sitter_rating();
