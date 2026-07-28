import { getAdminReservations } from "@/features/admin/actions";
import AdminStateClient from "@/features/admin/components/AdminStateClient";

export default async function AdminStatePage() {
  const reservations = await getAdminReservations();
  return <AdminStateClient initialReservations={reservations} />;
}
