import { getAdminReservations } from "@/features/admin/actions";
import AdminStateClient from "@/features/admin/components/AdminStateClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("예약 상태 관리");

export default async function AdminStatePage() {
  const reservations = await getAdminReservations();
  return <AdminStateClient initialReservations={reservations} />;
}
