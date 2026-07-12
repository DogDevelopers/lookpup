import BoardEditClient from "@/features/board/components/BoardEditClient";

// TODO: 로그인 여부 확인 후 리다이렉트, features/board/queries.ts로 post/pets 실데이터 조회.
export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardEditClient id={id} />;
}
