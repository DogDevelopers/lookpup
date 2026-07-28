export type MyProfileRole = "owner" | "both" | "admin";

export interface MyProfileUser {
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  displayArea: string | null;
  birthdate: string | null;
  profileImage: string | null;
  isVerified: boolean;
  role: MyProfileRole;
}

export interface MyProfileSitterSummary {
  id: string;
  rating: number;
  reviewCount: number;
  career: string | null;
  services: string[];
}
