export type ReservationUiStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface MyReservation {
  id: string;
  bookingNo: string;
  serviceType: string;
  status: ReservationUiStatus;
  sitterName: string;
  sitterImage: string | null;
  sitterRating: number;
  date: string;
  time: string;
  location: string;
  petName: string;
  petType: string;
  price: number;
  reviewWritten: boolean;
}

export interface MySitterReservation {
  id: string;
  bookingNo: string;
  serviceType: string;
  status: ReservationUiStatus;
  ownerName: string;
  ownerImage: string | null;
  date: string;
  time: string;
  petName: string;
  petType: string;
  price: number;
}

export interface ReservationDetail {
  id: string;
  bookingNo: string;
  serviceType: string;
  status: ReservationUiStatus;
  sitter: {
    name: string;
    image: string | null;
    rating: number;
    reviewCount: number;
    certified: boolean;
  };
  date: string;
  time: string;
  location: string;
  pet: {
    name: string;
    breed: string;
    animalType: string;
    age: number;
    weight: number;
    imageUrl: string | null;
  };
  price: number;
  reviewWritten: boolean;
}

/** getActiveReservationsForRoom / getReadyReservationsForRoom 공용 반환 항목 */
export interface ActiveReservation {
  id: string;
  status: string;
  startDatetime: string | null;
  endDatetime: string | null;
  totalPrice: number;
  isBasePaid?: boolean;
  serviceTitle: string;
  petName: string | null;
}

/**
 * getReservationRequestDetails(reservations 도메인)와
 * getRequestDetailsForReservation(applications 도메인)이 공유하는 반환 형태.
 */
export interface ReservationRequestDetails {
  title: string;
  startDatetime: string | null;
  endDatetime: string | null;
  requestType: string | null;
  location: string | null;
  totalPrice: number;
  petName: string | null;
  petAnimalType: string | null;
  petBreed: string | null;
}

/** getReservationsByRoom 반환 항목 (ReservationEditModal에서 사용) */
export interface ReservationByRoomItem {
  id: string;
  start_datetime: string | null;
  end_datetime: string | null;
  total_price: number;
  status: string;
  memo: string | null;
  pets: { id: string; name: string; animal_type: string }[];
}
