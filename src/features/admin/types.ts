export type ReportStatus = "pending" | "in_review" | "resolved" | "rejected";
export type SitterStatus = "pending" | "approved" | "rejected";
export type ReservationStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "canceled";

export interface Reporter {
  id: string;
  full_name: string | null;
  profile_image: string | null;
  email: string | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  content: string | null;
  status: string;
  image_urls: string[] | null;
  admin_memo: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  reporter: Reporter | Reporter[] | null;
}

export interface SitterApplicantUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  profile_image: string | null;
}

export interface SitterApplication {
  id: string;
  user_id: string;
  status: string;
  title: string | null;
  introduction: string | null;
  career: string | null;
  available_area: string | null;
  display_area: string | null;
  base_price: number | null;
  request_type: string[];
  available_animals: string[];
  certificate_urls: string[];
  activity_photo_urls: string[];
  created_at: string | null;
  users: SitterApplicantUser | SitterApplicantUser[] | null;
}

export interface ReservationUserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  profile_image: string | null;
}

export interface ReservationSitterInfo {
  id: string;
  user_id: string;
  users: ReservationUserInfo | ReservationUserInfo[] | null;
}

export interface Reservation {
  id: string;
  status: string;
  total_price: number;
  start_datetime: string | null;
  end_datetime: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  cancel_reason: string | null;
  memo: string | null;
  owner: ReservationUserInfo | ReservationUserInfo[] | null;
  sitter: ReservationSitterInfo | ReservationSitterInfo[] | null;
}
