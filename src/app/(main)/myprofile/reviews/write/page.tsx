import { getReservationById } from "@/features/reservations/actions";
import ReviewWriteClient from "@/features/reviews/components/ReviewWriteClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("후기 작성");

export default async function ReviewWritePage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;
  const booking = bookingId ? await getReservationById(bookingId) : null;

  return <ReviewWriteClient reservationId={bookingId ?? ""} booking={booking} />;
}
