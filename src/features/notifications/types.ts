export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
