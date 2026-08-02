
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
