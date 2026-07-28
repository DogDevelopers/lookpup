import { getAdminReports } from "@/features/admin/actions";
import AdminReportsClient from "@/features/admin/components/AdminReportsClient";

export default async function AdminReportsPage() {
  const reports = await getAdminReports();
  return <AdminReportsClient initialReports={reports} />;
}
