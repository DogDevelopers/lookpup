import { getAdminReports } from "@/features/admin/actions";
import AdminReportsClient from "@/features/admin/components/AdminReportsClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("신고 관리");

export default async function AdminReportsPage() {
  const reports = await getAdminReports();
  return <AdminReportsClient initialReports={reports} />;
}
