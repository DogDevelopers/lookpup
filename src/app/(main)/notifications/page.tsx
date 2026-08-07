import NotificationsClient from "@/features/notifications/components/NotificationsClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("알림");

export default function NotificationsPage() {
  return <NotificationsClient />;
}
