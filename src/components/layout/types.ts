export interface HeaderUser {
  fullName: string | null;
  email: string | null;
  profileImage: string | null;
  role: "owner" | "both" | "admin";
  isVerified: boolean;
}

export interface HeaderNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
}
