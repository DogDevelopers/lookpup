// 펫시터 등록/관리 화면에서 공유하는 서비스·동물 옵션.
// features/sitter-register(등록 폼)와 features/admin(승인 상세) 둘 다에서 쓰여 lib으로 승격.

export type SitterServiceId = "visit" | "foster" | "walk" | "pickup";
export type SitterAnimalId = "small_dog" | "medium_dog" | "large_dog" | "cat";

export const SERVICES: {
  id: SitterServiceId;
  emoji: string;
  title: string;
  desc: string;
}[] = [
  { id: "visit", emoji: "🏠", title: "방문돌봄", desc: "보호자님 집에서 돌봄" },
  { id: "foster", emoji: "🏡", title: "위탁돌봄", desc: "내 집에서 돌봄" },
  { id: "walk", emoji: "🚶", title: "산책", desc: "반려동물 산책 서비스" },
  { id: "pickup", emoji: "🚗", title: "픽업", desc: "반려동물 픽업 서비스" },
];

export const ANIMALS: { id: SitterAnimalId; label: string }[] = [
  { id: "small_dog", label: "소형견 (7kg 이하)" },
  { id: "medium_dog", label: "중형견 (7-15kg)" },
  { id: "large_dog", label: "대형견 (15kg 이상)" },
  { id: "cat", label: "고양이" },
];
