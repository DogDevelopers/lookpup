import NotificationsClient from "@/features/notifications/components/NotificationsClient";

// TODO: 로그인 여부 확인 + features/notifications/queries.ts로 실데이터 조회,
// 실시간 구독(NotificationsRealtimeSync) 연동.
export default function NotificationsPage() {
  return <NotificationsClient />;
}
