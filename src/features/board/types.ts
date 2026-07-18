// 구인게시판 작성/수정 폼에서 사용하는 반려동물 (UI 표시용으로 가공된 형태)
export type Pet = {
  id: string;
  name: string;
  type: string;
  age: number | null;
  weight: number | null;
  emoji: string;
  image_url: string | null;
};

// GET /api/pets 응답 행 (필요한 필드만)
export type PetRow = {
  id: string;
  name: string;
  animal_type: string;
  age: number | null;
  weight: number | null;
  image_url: string | null;
};

export type PostListItem = {
  id: string;
  category: string;
  title: string;
  desc: string;
  location: string;
  period: string;
  price: string;
  createdAt: string;
  status: string;
};

export type PostData = {
  status: string;
  request_type: string;
  budget: number;
  start_datetime: string;
  end_datetime: string;
  content: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  pets: { id: string } | null;
  title: string;
  image_urls: string[];
};

export type DetailPet = {
  id: string;
  name: string;
  animal_type: string;
  breed: string | null;
};

export type Application = {
  id: string;
  message: string | null;
  proposed_price: number | null;
  status: string;
  sitters: {
    id: string;
    users: { full_name: string; profile_image: string | null } | null;
  } | null;
};

export type OtherPost = {
  id: string;
  title: string;
  location: string;
  budget: number;
  status: string;
  created_at: string;
};

export type MyRequestRow = {
  id: string;
  title: string;
  status: string;
  request_type: string;
  start_datetime: string | null;
  end_datetime: string | null;
  budget: number | null;
  location: string | null;
  created_at: string;
  pets: { name: string; animal_type: string } | null;
  applications: {
    status: string;
    sitters: { users: { full_name: string | null } | null } | null;
  }[];
  reservations: { status: string }[];
};

export type RequestDetail = {
  id: string;
  owner_id: string;
  title: string;
  content: string | null;
  start_datetime: string;
  end_datetime: string;
  budget: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  view_count: number;
  created_at: string;
  image_urls: string[];
  users: {
    full_name: string;
    profile_image: string | null;
    is_verified: boolean;
    created_at: string;
  } | null;
  pets: DetailPet | null;
  applications: Application[];
};
