export interface RoomApiItem {
  id: string;
  room_type: "direct" | "request" | "reservation_request";
  owner_id: string | null;
  sitter_id: string | null;
  reservation_id: string | null;
  other_user_full_name: string | null;
  other_user_profile_image: string | null;
  sitter_rating: number | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  request_id: string | null;
  request_title: string | null;
  request_status: string | null;
  request_created_at: string | null;
  application_status: string | null;
  reservation_status: string | null;
  reservation_service_title: string | null;
  reservation_pet_names: string[];
  reservation_start_datetime: string | null;
  recipient_left: boolean;
}

export interface ChatMessageRow {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessagesPage {
  messages: ChatMessageRow[];
  next_cursor: string | null;
}

export interface ReservationByRoomItem {
  id: string;
  start_datetime: string | null;
  end_datetime: string | null;
  total_price: number;
  status: string;
  memo: string | null;
  pets: { id: string; name: string; animal_type: string }[];
}
