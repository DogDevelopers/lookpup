import SitterDetailClient from "@/features/petsitters/components/SitterDetailClient";

// TODO: features/petsitters/queries.ts로 sitter/reviews 실데이터를 조회해 전달.
export default async function PetsitterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; roomId?: string }>;
}) {
  const { id } = await params;
  const { from, roomId } = await searchParams;
  return <SitterDetailClient sitterId={id} from={from} roomId={roomId} />;
}
