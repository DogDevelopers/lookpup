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

export const WITHDRAW_REASON_VALUES = [
  "low_usage",
  "no_service",
  "inconvenient",
  "privacy",
  "other",
] as const;

export type WithdrawReason = (typeof WITHDRAW_REASON_VALUES)[number];

export const WITHDRAW_REASONS: { value: WithdrawReason; label: string }[] = [
  { value: "low_usage", label: "이용 빈도가 낮음" },
  { value: "no_service", label: "원하는 서비스가 없음" },
  { value: "inconvenient", label: "이용이 불편함" },
  { value: "privacy", label: "개인정보 보호 우려" },
  { value: "other", label: "기타" },
];

export const SITTER_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

export type SitterStatus = (typeof SITTER_STATUS_VALUES)[number];
