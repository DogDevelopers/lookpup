import AdminStateClient from "@/features/admin/components/AdminStateClient";

// TODO: features/admin/queries.ts로 reservations 실데이터 조회.
export default function AdminStatePage() {
  return <AdminStateClient initialReservations={[]} />;
}
