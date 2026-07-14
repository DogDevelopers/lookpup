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

export const WITHDRAW_REASONS = [
  { value: "not_useful", label: "서비스를 잘 이용하지 않아요" },
  { value: "hard_to_use", label: "사용 방법이 어려워요" },
  { value: "found_alternative", label: "다른 서비스를 이용하고 있어요" },
  { value: "privacy_concern", label: "개인정보 이용이 걱정돼요" },
  { value: "other", label: "기타" },
] as const;

export const WITHDRAW_REASON_VALUES = WITHDRAW_REASONS.map((r) => r.value) as [
  string,
  ...string[],
];
