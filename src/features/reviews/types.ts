export interface WrittenReview {
  id: string;
  rating: number;
  content: string;
  image_urls: string[];
  tags: string[];
  detail_ratings: Record<string, number>;
  created_at: string;
  sitter_full_name: string;
  sitter_profile_image: string | null;
}

export interface ReceivedReview {
  id: string;
  owner_id: string;
  owner_full_name: string;
  owner_profile_image: string | null;
  rating: number;
  content: string;
  image_urls: string[];
  tags: string[];
  detail_ratings: Record<string, number>;
  created_at: string;
}
