import { getMyReservations } from "@/features/petsitters/actions";
import BookingHistoryClient from "@/features/petsitters/components/BookingHistoryClient";

export default async function BookingHistoryPage() {
  const bookings = await getMyReservations();
  return <BookingHistoryClient bookings={bookings} />;
}
