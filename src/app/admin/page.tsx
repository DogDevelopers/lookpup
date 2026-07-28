import { getAdminReports, getAdminReservations, getAdminSitters } from "@/features/admin/actions";
import AdminDashboard from "@/features/admin/components/AdminDashboard";

export default async function AdminPage() {
  const [reports, reservations, sitters] = await Promise.all([
    getAdminReports(),
    getAdminReservations(),
    getAdminSitters(),
  ]);

  return (
    <AdminDashboard initialReports={reports} initialReservations={reservations} initialSitters={sitters} />
  );
}
