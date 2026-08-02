/**
 * excl_reservations_sitter_period 위반 여부.
 * 23P01 = exclusion_violation — 같은 시터에 기간이 겹치는 예약이 이미 있다는 뜻.
 */
export function isOverlapViolation(error: { code?: string } | null): boolean {
  return error?.code === "23P01";
}
