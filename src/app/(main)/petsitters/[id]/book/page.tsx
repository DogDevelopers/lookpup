import BookingClient from "@/features/petsitters/components/BookingClient";

// TODO: features/petsitters/queries.ts로 sitter/bookedRanges, pet-register 이식 후 pets 실데이터를 조회해 전달.
export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingClient sitterId={id} />;
}
