import { notFound } from "next/navigation";
import { getReservationById } from "@/features/reservations/actions";
import { getCareRecordsByReservationId } from "@/features/care-records/actions";
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

  const careRecords = await getCareRecordsByReservationId(id);

  return (
    <BookingDetailClient
      booking={booking}
      careRecords={careRecords.ok ? careRecords.data : []}
    />
  );
}
