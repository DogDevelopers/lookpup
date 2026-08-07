import { notFound } from "next/navigation";
import { getReservationById } from "@/features/reservations/actions";
import { getCareRecordsByReservationId } from "@/features/care-records/actions";
import { getReviewByReservationId } from "@/features/reviews/actions";
import BookingDetailClient from "@/features/petsitters/components/BookingDetailClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("예약 상세");

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getReservationById(id);

  if (!booking) {
    notFound();
  }

  const [careRecords, review] = await Promise.all([
    getCareRecordsByReservationId(id),
    getReviewByReservationId(id),
  ]);

  return (
    <BookingDetailClient
      booking={booking}
      careRecords={careRecords.ok ? careRecords.data : []}
      review={review}
    />
  );
}
