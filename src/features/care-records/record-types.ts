export type CareRecordType =
  | "visit"
  | "check_in"
  | "check_out"
  | "pickup_start"
  | "pickup_done"
  | "handover"
  | "meal"
  | "walk"
  | "potty"
  | "medication"
  | "play"
  | "rest"
  | "condition"
  | "photo"
  | "memo";

export type ServiceType = "pickup" | "walk" | "care" | "hotel";

export type FieldType = "time" | "text" | "number" | "textarea" | "select" | "photo";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  optional?: boolean;
}

export interface RecordTypeConfig {
  type: CareRecordType;
  emoji: string;
  label: string;
  statusText: string;
  fields: FieldConfig[];
}

export const SERVICE_TYPE_RECS: Record<ServiceType, CareRecordType[]> = {
  pickup: ["pickup_start", "pickup_done", "handover", "photo", "memo"],
  walk: ["visit", "check_in", "walk", "potty", "photo", "memo"],
  care: [
    "check_in", "meal", "walk", "potty", "medication",
    "play", "condition", "photo", "memo", "check_out",
  ],
  hotel: [
    "check_in", "meal", "walk", "potty", "medication",
    "play", "rest", "condition", "photo", "memo", "check_out",
  ],
};

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  pickup: "픽업",
  walk: "산책",
  care: "방문돌봄",
  hotel: "위탁돌봄",
};

export const CARE_RECORD_TYPES: RecordTypeConfig[] = [
  {
    type: "visit",
    emoji: "🏠",
    label: "방문",
    statusText: "방문 완료",
    fields: [
      { key: "time", label: "방문 시간", type: "time" },
      { key: "memo", label: "메모", type: "textarea", placeholder: "특이사항을 입력하세요", optional: true },
    ],
  },
  {
    type: "check_in",
    emoji: "🏠",
    label: "체크인",
    statusText: "체크인 완료",
    fields: [
      { key: "time", label: "체크인 시간", type: "time" },
      { key: "memo", label: "메모", type: "textarea", placeholder: "특이사항을 입력하세요", optional: true },
    ],
  },
  {
    type: "check_out",
    emoji: "🚪",
    label: "체크아웃",
    statusText: "체크아웃 완료",
    fields: [
      { key: "time", label: "체크아웃 시간", type: "time" },
      { key: "memo", label: "메모", type: "textarea", placeholder: "특이사항을 입력하세요", optional: true },
    ],
  },
  {
    type: "pickup_start",
    emoji: "🚗",
    label: "픽업 출발",
    statusText: "픽업 출발",
    fields: [
      { key: "departure", label: "출발 위치", type: "text", placeholder: "출발 위치를 입력하세요" },
      { key: "eta", label: "예상 도착 시간", type: "time" },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "pickup_done",
    emoji: "✅",
    label: "픽업 완료",
    statusText: "픽업 완료",
    fields: [
      { key: "arrival", label: "도착 위치", type: "text", placeholder: "도착 위치를 입력하세요" },
      { key: "time", label: "실제 도착 시간", type: "time" },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "handover",
    emoji: "🤝",
    label: "보호자 인계",
    statusText: "인계 완료",
    fields: [
      { key: "target", label: "인계 대상", type: "text", placeholder: "인계 받는 분 이름" },
      { key: "time", label: "인계 시간", type: "time" },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "meal",
    emoji: "🍚",
    label: "식사",
    statusText: "식사 완료",
    fields: [
      { key: "mealTime", label: "식사 시간", type: "select", options: ["아침", "점심", "저녁", "간식"] },
      { key: "amount", label: "식사량", type: "select", options: ["전부 먹음", "절반 먹음", "조금 먹음", "안 먹음"] },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "walk",
    emoji: "🚶",
    label: "산책",
    statusText: "산책 완료",
    fields: [
      { key: "duration", label: "산책 시간 (분)", type: "number", placeholder: "예: 30" },
      { key: "distance", label: "산책 거리", type: "text", placeholder: "예: 1.5km", optional: true },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "potty",
    emoji: "💩",
    label: "배변",
    statusText: "배변 기록",
    fields: [
      { key: "pottyType", label: "배변 종류", type: "select", options: ["소변", "대변", "둘 다"] },
      { key: "condition", label: "배변 상태", type: "select", options: ["정상", "묽음", "딱딱함", "기타"] },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "medication",
    emoji: "💊",
    label: "약 복용",
    statusText: "약 복용 완료",
    fields: [
      { key: "name", label: "약 이름", type: "text", placeholder: "약 이름을 입력하세요" },
      { key: "time", label: "복용 시간", type: "time" },
      { key: "status", label: "복용 여부", type: "select", options: ["완료", "거부", "부분 복용"] },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "play",
    emoji: "🎾",
    label: "놀이/케어",
    statusText: "케어 완료",
    fields: [
      { key: "activity", label: "활동 종류", type: "select", options: ["놀이", "빗질", "목욕", "훈련", "기타"] },
      { key: "duration", label: "활동 시간 (분)", type: "number", placeholder: "예: 20" },
      { key: "reaction", label: "반려동물 반응", type: "select", options: ["좋아함", "보통", "싫어함"] },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "rest",
    emoji: "😴",
    label: "휴식/수면",
    statusText: "휴식 기록",
    fields: [
      { key: "duration", label: "수면/휴식 시간", type: "text", placeholder: "예: 2시간 30분" },
      { key: "condition", label: "컨디션", type: "select", options: ["편안함", "불안함", "피곤함", "활발함"] },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "condition",
    emoji: "💗",
    label: "상태 체크",
    statusText: "상태 체크",
    fields: [
      { key: "condition", label: "컨디션", type: "select", options: ["좋음", "보통", "나쁨", "이상 있음"] },
      { key: "water", label: "물 섭취", type: "select", options: ["정상", "적음", "많음"] },
      { key: "memo", label: "특이사항", type: "textarea", optional: true },
    ],
  },
  {
    type: "photo",
    emoji: "📷",
    label: "사진",
    statusText: "사진 기록",
    fields: [
      { key: "photo", label: "사진 첨부", type: "photo" },
      { key: "description", label: "설명", type: "text", placeholder: "사진 설명을 입력하세요", optional: true },
      { key: "memo", label: "메모", type: "textarea", optional: true },
    ],
  },
  {
    type: "memo",
    emoji: "📝",
    label: "메모",
    statusText: "메모 기록",
    fields: [
      { key: "memo", label: "특이사항", type: "textarea", placeholder: "전달할 내용을 입력하세요" },
    ],
  },
];
