import type { Metadata } from "next";
import SitterDetailClient from "@/features/petsitters/components/SitterDetailClient";
import { getSitterDetail, getSitterReviews } from "@/features/petsitters/queries";

// 색인하면 시터의 실명·프로필 사진·활동 지역이 검색 결과에 노출된다.
// 시터 동의 절차를 갖추기 전까지는 noindex를 유지한다.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sitter = await getSitterDetail(id);
  if (!sitter) return { title: "펫시터를 찾을 수 없습니다", robots: { index: false } };

  const name = sitter.full_name ?? "펫시터";
  return {
    title: `${name} 펫시터`,
    description: sitter.display_area
      ? `${sitter.display_area}에서 활동하는 ${name} 펫시터의 프로필과 후기`
      : `${name} 펫시터의 프로필과 후기`,
    robots: { index: false },
  };
}

export default async function PetsitterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; roomId?: string }>;
}) {
  const { id } = await params;
  const { from, roomId } = await searchParams;
  const [sitter, reviews] = await Promise.all([getSitterDetail(id), getSitterReviews(id)]);
  return (
    <SitterDetailClient sitterId={id} from={from} roomId={roomId} sitter={sitter} reviews={reviews} />
  );
}
