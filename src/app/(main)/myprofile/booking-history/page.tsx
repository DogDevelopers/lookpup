import { getMyReservations } from "@/features/reservations/actions";
import BookingHistoryClient from "@/features/petsitters/components/BookingHistoryClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("예약 내역");

export default async function BookingHistoryPage() {
  const bookings = await getMyReservations();
  return <BookingHistoryClient bookings={bookings} />;
}
