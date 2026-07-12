import BoardDetailClient from "@/features/board/components/BoardDetailClient";

// TODO: features/board/queries.ts로 post/otherPosts 실데이터 조회, 로그인/펫시터 상태 확인.
export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardDetailClient id={id} />;
}
