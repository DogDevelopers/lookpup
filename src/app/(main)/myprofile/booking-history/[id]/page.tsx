import { notFound } from "next/navigation";
import { getReservationById } from "@/features/petsitters/actions";
import BookingDetailClient from "@/features/petsitters/components/BookingDetailClient";

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

  return <BookingDetailClient booking={booking} />;
}
