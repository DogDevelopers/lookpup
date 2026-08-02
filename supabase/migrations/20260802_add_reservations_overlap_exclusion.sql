-- 같은 시터에게 기간이 겹치는 예약이 동시에 존재하지 못하도록 DB 레벨에서 차단.
--
-- 애플리케이션 검사만으로는 부족한 이유:
--   1. 예약 생성 경로가 둘(펫시터 예약 요청 / 구인글 지원 수락)인데 후자에는 겹침 검사가 없었다.
--   2. 관리자의 canceled -> accepted 되돌리기도 검사를 거치지 않는다.
--   3. 조회-후-INSERT 사이의 레이스는 애플리케이션 코드로 막을 수 없다.
--
-- uuid의 =와 범위의 &&를 한 GiST 인덱스에 섞으려면 btree_gist가 필요하다.

create extension if not exists btree_gist;

alter table public.reservations
  add constraint chk_reservations_period
  check (start_datetime is null or end_datetime is null
         or end_datetime > start_datetime);

-- tstzrange 기본 경계는 [) — 앞 예약이 끝나는 시각에 다음 예약을 시작하는 건 허용된다.
-- start/end가 NULL이면 tstzrange가 무한대 범위가 되어 모든 예약과 겹치므로 대상에서 제외한다.
-- canceled(거절 포함)는 날짜를 점유하지 않는다 — get_sitter_booked_ranges와 같은 기준.
alter table public.reservations
  add constraint excl_reservations_sitter_period
  exclude using gist (
    sitter_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  )
  where (status <> 'canceled'
         and start_datetime is not null
         and end_datetime is not null);
