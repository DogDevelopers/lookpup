
import { Home, Heart, PawPrint, Car } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Pet, PetRow } from "./types";

export const SERVICE_TYPES: { label: string; icon: LucideIcon; value: string }[] =
  [
    { label: "방문 돌봄", icon: Home, value: "care" },
    { label: "위탁 돌봄", icon: Heart, value: "foster" },
    { label: "산책", icon: PawPrint, value: "walk" },
    { label: "픽업", icon: Car, value: "pickup" },
  ];

export const BUDGET_PRESETS = [10000, 20000, 30000, 50000];

export const SITTER_CONDITIONS = [
  "강아지 산책 경험 필수",
  "책임감 있고 성실하신 분",
  "반려동물에 대한 애정이 있으신 분",
  "인증 펫시터만 (Badge 보유자 우선)",
  "여성 펫시터 선호",
  "반려동물 자격증 보유자 우선",
  "흡연자 제외",
];

export const ANIMAL_TYPE_MAP: Record<string, { label: string; emoji: string }> =
  {
    dog: { label: "강아지", emoji: "🐶" },
    cat: { label: "고양이", emoji: "🐱" },
    other: { label: "기타", emoji: "🐾" },
  };

export function mapPetRow(p: PetRow): Pet {
  return {
    id: p.id,
    name: p.name,
    type: ANIMAL_TYPE_MAP[p.animal_type]?.label ?? p.animal_type,
    age: p.age,
    weight: p.weight,
    emoji: ANIMAL_TYPE_MAP[p.animal_type]?.emoji ?? "🐾",
    image_url: p.image_url,
  };
}
