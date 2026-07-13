// DB CHECK 제약과 1:1로 동기화되는 status 상수. 새 값 추가 시 마이그레이션 먼저.

export const REQUEST_STATUS = {
  OPEN: "open",
  MATCHED: "matched",
  CLOSED: "closed",
  CANCELED: "canceled",
} as const;

export const APPLICATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELED: "canceled",
} as const;
