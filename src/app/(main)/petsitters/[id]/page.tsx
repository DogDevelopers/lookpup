import SitterDetailClient from "@/features/petsitters/components/SitterDetailClient";
import { getSitterDetail, getSitterReviews } from "@/features/petsitters/queries";

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
