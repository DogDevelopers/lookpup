import type {
  Applicant,
  ChatRoom,
  Message,
  ReservationRequest,
} from "./components/chat_components";

export type Post = {
  id: string;
  title: string;
  status: string;
};

export const MOCK_USER_ID = "user-owner-1";

export const mockPosts: Post[] = [
  { id: "post-1", title: "강아지 산책 · 은평구", status: "모집중" },
];

export const mockRooms: ChatRoom[] = [
  {
    id: "room-1",
    ownerId: MOCK_USER_ID,
    sitterId: "sitter-1",
    reservationId: "reservation-1",
    reservationStatus: "in_progress",
    name: "김펫시",
    initial: "김",
    profileImage: null,
    sub: "강아지 산책 · 은평구",
    lastMessage: "결제가 완료되었어요!",
    time: "오후 2:41",
    unread: 2,
    recipientLeft: false,
  },
  {
    id: "room-2",
    ownerId: MOCK_USER_ID,
    sitterId: "sitter-2",
    reservationId: null,
    reservationStatus: null,
    name: "이보호",
    initial: "이",
    profileImage: null,
    sub: "",
    lastMessage: "네, 알겠습니다!",
    time: "어제",
    unread: 0,
    recipientLeft: false,
  },
];

export const mockApplicants: Applicant[] = [
  {
    id: "applicant-1",
    sitterId: "sitter-3",
    ownerId: MOCK_USER_ID,
    postId: "post-1",
    name: "박시터",
    initial: "박",
    profileImage: null,
    rating: 4.8,
    preview: "안녕하세요! 지원합니다.",
    time: "오전 10:12",
    unread: 1,
    applicationStatus: "pending",
    location: "서울 은평구",
    reviewCount: 32,
    services: ["산책", "위탁돌봄"],
    experience: "3년",
    recipientLeft: false,
  },
  {
    id: "applicant-2",
    sitterId: "sitter-4",
    ownerId: MOCK_USER_ID,
    postId: "post-1",
    name: "최펫케어",
    initial: "최",
    profileImage: null,
    rating: 4.5,
    preview: "잘 부탁드립니다!",
    time: "오전 9:03",
    unread: 0,
    applicationStatus: "pending",
    location: "서울 서대문구",
    reviewCount: 12,
    services: ["방문돌봄"],
    experience: "1년",
    recipientLeft: false,
  },
];

export const mockReservationRequests: ReservationRequest[] = [
  {
    id: "reservation-req-1",
    sitterId: "sitter-5",
    ownerId: MOCK_USER_ID,
    reservationId: "reservation-2",
    name: "정펫짱",
    initial: "정",
    profileImage: null,
    rating: 4.9,
    sub: "고양이 방문돌봄",
    preview: "예약 요청 드립니다!",
    time: "오전 11:20",
    unread: 1,
    reservationStatus: "pending",
    recipientLeft: false,
  },
];

export const mockMessagesByRoomId: Record<string, Message[]> = {
  "room-1": [
    {
      id: "m1",
      from: "date_separator",
      text: "2026년 7월 10일 금요일",
    },
    {
      id: "m2",
      from: "other",
      text: "안녕하세요! 산책 예약 관련해서 연락드려요.",
      time: "오전 9:02",
      rawDate: "2026-07-10T09:02:00",
    },
    {
      id: "m3",
      from: "me",
      text: "네 안녕하세요! 잘 부탁드립니다 :)",
      time: "오전 9:05",
      rawDate: "2026-07-10T09:05:00",
    },
    {
      id: "m4",
      from: "reservation_request",
      text: "",
      time: "오전 9:10",
      rawDate: "2026-07-10T09:10:00",
      reservationRequestData: {
        reservationId: "reservation-1",
        serviceTitle: "강아지 산책",
        startDatetime: "2026-07-12T10:00:00",
        endDatetime: "2026-07-12T11:00:00",
        totalPrice: 30000,
        petNames: ["초코"],
        sentByMe: true,
      },
    },
    {
      id: "m5",
      from: "reservation_accepted",
      text: "",
      time: "오전 9:15",
      rawDate: "2026-07-10T09:15:00",
      reservationAcceptedData: {
        reservationId: "reservation-1",
        totalPrice: 30000,
        startDatetime: "2026-07-12T10:00:00",
        endDatetime: "2026-07-12T11:00:00",
        sentByMe: false,
      },
    },
    {
      id: "m6",
      from: "payment_request",
      text: "",
      time: "오전 9:16",
      rawDate: "2026-07-10T09:16:00",
      paymentData: {
        amount: 30000,
        reason: "강아지 산책 서비스",
        deadline: "2026-07-11 23:59",
        sentByMe: false,
        costItems: [
          { id: "c1", name: "기본 산책 (1시간)", amount: "30000", description: "" },
        ],
      },
    },
    {
      id: "m7",
      from: "payment_complete",
      text: "",
      time: "오전 9:20",
      rawDate: "2026-07-10T09:20:00",
      paymentData: { amount: 30000, reason: "", deadline: "", sentByMe: true },
      sentByMe: true,
    },
    {
      id: "m8",
      from: "date_separator",
      text: "2026년 7월 12일 일요일",
    },
    {
      id: "m9",
      from: "service_start",
      text: "",
      time: "오전 10:00",
      rawDate: "2026-07-12T10:00:00",
      serviceStartData: {
        reservationId: "reservation-1",
        serviceTitle: "강아지 산책",
        petName: "초코",
        startDatetime: "2026-07-12T10:00:00",
      },
      sentByMe: false,
    },
    {
      id: "m10",
      from: "other",
      imageUrl: "/globe.svg",
      text: "",
      time: "오전 10:20",
      rawDate: "2026-07-12T10:20:00",
    },
    {
      id: "m11",
      from: "service_complete",
      text: "",
      time: "오전 11:00",
      rawDate: "2026-07-12T11:00:00",
      serviceCompleteData: {
        reservationId: "reservation-1",
        serviceTitle: "강아지 산책",
        petName: "초코",
        startDatetime: "2026-07-12T10:00:00",
        endDatetime: "2026-07-12T11:00:00",
        totalPrice: 30000,
      },
    },
    {
      id: "m12",
      from: "service_complete_confirmed",
      text: "",
      time: "오전 11:05",
      rawDate: "2026-07-12T11:05:00",
      serviceCompleteConfirmedData: {
        reservationId: "reservation-1",
        serviceTitle: "강아지 산책",
        petName: "초코",
        totalPrice: 30000,
      },
      sentByMe: true,
    },
    {
      id: "m13",
      from: "reservation_edit",
      text: "",
      time: "오후 1:00",
      rawDate: "2026-07-12T13:00:00",
      reservationEditData: {
        reservationId: "reservation-1",
        original: {
          start_datetime: "2026-07-12T10:00:00",
          end_datetime: "2026-07-12T11:00:00",
          memo: "",
        },
        proposed: {
          start_datetime: "2026-07-13T10:00:00",
          end_datetime: "2026-07-13T12:00:00",
          memo: "30분 추가 산책 요청",
        },
        sentByMe: false,
      },
    },
    {
      id: "m14",
      from: "reservation_edit_response",
      text: "",
      time: "오후 1:05",
      rawDate: "2026-07-12T13:05:00",
      reservationEditResponseData: {
        originalMessageId: "m13",
        accepted: true,
        sentByMe: true,
      },
    },
  ],
  "room-2": [
    {
      id: "n1",
      from: "date_separator",
      text: "2026년 7월 11일 토요일",
    },
    {
      id: "n2",
      from: "other",
      text: "안녕하세요, 상담 가능하실까요?",
      time: "오후 3:00",
      rawDate: "2026-07-11T15:00:00",
    },
    {
      id: "n3",
      from: "me",
      text: "네, 알겠습니다!",
      time: "오후 3:02",
      rawDate: "2026-07-11T15:02:00",
    },
  ],
};

export const mockApplicantMessages: Record<string, Message[]> = {
  "applicant-1": [
    {
      id: "a1",
      from: "other",
      text: "안녕하세요! 구인글 보고 지원합니다.",
      time: "오전 10:12",
      rawDate: "2026-07-11T10:12:00",
    },
    {
      id: "a2",
      from: "application_selected",
      text: "",
      time: "오전 10:30",
      rawDate: "2026-07-11T10:30:00",
      applicationData: {
        postTitle: "강아지 산책 · 은평구",
        postId: "post-1",
        sitterId: "sitter-3",
        sentByMe: true,
      },
    },
  ],
  "applicant-2": [
    {
      id: "b1",
      from: "other",
      text: "잘 부탁드립니다!",
      time: "오전 9:03",
      rawDate: "2026-07-11T09:03:00",
    },
    {
      id: "b2",
      from: "application_rejected",
      text: "",
      time: "오전 9:30",
      rawDate: "2026-07-11T09:30:00",
      applicationData: {
        postTitle: "강아지 산책 · 은평구",
        postId: "post-1",
        sitterId: "sitter-4",
        sentByMe: true,
      },
    },
  ],
};

export const mockReservationMessages: Record<string, Message[]> = {
  "reservation-req-1": [
    {
      id: "r1",
      from: "other",
      text: "예약 요청 드립니다!",
      time: "오전 11:20",
      rawDate: "2026-07-11T11:20:00",
    },
    {
      id: "r2",
      from: "reservation_rejected",
      text: "",
      time: "오전 11:40",
      rawDate: "2026-07-11T11:40:00",
      sentByMe: false,
    },
  ],
};
