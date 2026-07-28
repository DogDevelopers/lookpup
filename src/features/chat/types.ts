export type Tab = "one_on_one" | "sitter" | "owner";
export type SelectedKind = "room" | "reservation" | "applicant" | null;

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

export type ChatRoom = {
  id: string;
  ownerId: string | null;
  sitterId: string | null;
  reservationId: string | null;
  reservationStatus: string | null;
  name: string;
  initial: string;
  profileImage?: string | null;
  sub: string;
  lastMessage: string;
  time: string;
  unread: number;
  recipientLeft: boolean;
};

export type Applicant = {
  id: string;
  sitterId: string | null;
  ownerId: string | null;
  postId: string;
  name: string;
  initial: string;
  profileImage?: string | null;
  rating: number;
  preview: string;
  time: string;
  unread: number;
  applicationStatus?: string | null;
  location?: string;
  reviewCount?: number;
  services?: string[];
  experience?: string;
  completedJobs?: string;
  recipientLeft: boolean;
};

export type ReservationRequest = {
  id: string;
  sitterId: string | null;
  ownerId: string | null;
  reservationId: string | null;
  name: string;
  initial: string;
  profileImage?: string | null;
  rating: number;
  sub: string;
  preview: string;
  time: string;
  unread: number;
  reservationStatus: string | null;
  recipientLeft: boolean;
};

export type CostItem = {
  id: string;
  name: string;
  amount: string;
  description: string;
};

export type PaymentData = {
  amount: number;
  reason: string;
  deadline: string;
  postId?: string;
  sentByMe?: boolean;
  isExtra?: boolean;
  costItems?: CostItem[];
  extraChargeId?: string;
};

export type ApplicationData = {
  postTitle: string;
  postId: string;
  sitterId: string;
  sentByMe?: boolean;
};

export type ServiceCompleteData = {
  reservationId: string;
  serviceTitle?: string;
  petName?: string;
  startDatetime?: string;
  endDatetime?: string;
  totalPrice?: number;
};

export type ReservationRequestData = {
  reservationId: string;
  serviceTitle: string;
  startDatetime: string;
  endDatetime: string;
  totalPrice: number;
  petNames: string[];
  sentByMe?: boolean;
};

export type ReservationAcceptedData = {
  reservationId: string;
  totalPrice: number;
  startDatetime?: string;
  endDatetime?: string;
  sentByMe?: boolean;
};

export type ReservationEditPayload = {
  reservationId: string;
  original: {
    start_datetime: string;
    end_datetime: string;
    memo?: string | null;
  };
  proposed: {
    start_datetime: string;
    end_datetime: string;
    memo?: string | null;
  };
  sentByMe?: boolean;
};

export type ReservationEditResponsePayload = {
  originalMessageId: string;
  accepted: boolean;
  sentByMe?: boolean;
};

export type ReservationEditActionState = {
  messageId: string;
  type: "confirm" | "reject";
} | null;

export type Message = {
  id: string;
  from:
    | "me"
    | "other"
    | "divider"
    | "date_separator"
    | "payment_request"
    | "payment_complete"
    | "application_selected"
    | "application_rejected"
    | "reservation_canceled"
    | "service_complete"
    | "service_complete_confirmed"
    | "reservation_request"
    | "reservation_accepted"
    | "reservation_rejected"
    | "service_start"
    | "reservation_edit"
    | "reservation_edit_response";
  text: string;
  imageUrl?: string;
  time?: string;
  rawDate?: string;
  paymentData?: PaymentData;
  paymentRequestMessageId?: string;
  applicationData?: ApplicationData;
  serviceCompleteData?: ServiceCompleteData;
  serviceCompleteConfirmedData?: ServiceCompleteData;
  serviceStartData?: ServiceCompleteData;
  reservationRequestData?: ReservationRequestData;
  reservationAcceptedData?: ReservationAcceptedData;
  reservationEditData?: ReservationEditPayload;
  reservationEditResponseData?: ReservationEditResponsePayload;
  sentByMe?: boolean;
};

export type Badge = {
  label: string;
  className: string;
};
