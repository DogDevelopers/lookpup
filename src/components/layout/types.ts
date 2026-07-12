export interface HeaderUser {
  fullName: string | null;
  email: string | null;
  profileImage: string | null;
  role: "user" | "sitter" | "admin";
  isVerified: boolean;
}

export interface HeaderNotification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
}
