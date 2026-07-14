import { getReservationById } from "@/features/petsitters/actions";
import ReviewWriteClient from "@/features/reviews/components/ReviewWriteClient";

export default async function ReviewWritePage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;
  const booking = bookingId ? await getReservationById(bookingId) : null;

  return <ReviewWriteClient reservationId={bookingId ?? ""} booking={booking} />;
}
