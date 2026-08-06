import { getAdminReports, getAdminReservations, getAdminSitters } from "@/features/admin/actions";
import AdminDashboard from "@/features/admin/components/AdminDashboard";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("관리자 대시보드");

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
