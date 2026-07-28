export interface SitterRow {
  id: string;
  display_area: string | null;
  latitude: number | null;
  longitude: number | null;
  base_price: number | null;
  rating: number | null;
  display_name: string | null;
  profile_image: string | null;
  service_types: string[];
  service_prices: Record<string, number>;
  review_count: number;
}

export interface SitterListItem {
  id: string;
  name: string;
  initial: string;
  profileImage: string | null;
  city: string;
  district: string;
  neighborhood: string;
  rating: number;
  reviewCount: number;
  price: number | null;
  services: string[];
  lat: number;
  lng: number;
}

export interface ServiceRow {
  service_type: string;
  title: string | null;
  description: string | null;
  price: number;
  animal_type: string | null;
}

export interface SitterDetail {
  id: string;
  is_self: boolean | null;
  full_name: string | null;
  profile_image: string | null;
  is_verified: boolean;
  introduction: string | null;
  career: string | null;
  available_area: string | null;
  display_area: string | null;
  latitude: number | null;
  longitude: number | null;
  base_price: number | null;
  rating: number;
  review_count: number;
  activity_photo_urls: string[];
  available_animals: string[];
  services: ServiceRow[];
}

export interface ReviewRow {
  id: string;
  rating: number;
  content: string;
  image_urls: string[] | null;
  tags: string[];
  created_at: string;
  owner: {
    full_name: string | null;
    profile_image: string | null;
  } | null;
}

export interface SitterService {
  id: string;
  service_type: string;
  title: string;
  price: number;
}

export interface SitterBookingInfo {
  id: string;
  name: string;
  initial: string;
  profileImage: string | null;
  pricePerDay: number;
  services: SitterService[];
}

export interface BookedRange {
  from: Date;
  to: Date;
}

// features/pet-register가 아직 이식되지 않아 임시로 이 도메인에 최소 형태로 둔다.
// TODO: pet-register 이식 후 공용 타입으로 승격 검토.
export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  image_url: string | null;
}
