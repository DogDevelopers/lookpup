import { createClient } from "@/lib/supabase/server";
import { SITTER_STATUS } from "@/lib/constants";
import type { SitterRow } from "./types";

type SitterSearchRow = {
  id: string;
  display_area: string | null;
  latitude: number | null;
  longitude: number | null;
  base_price: number | null;
  rating: number | null;
  users: { full_name: string | null; profile_image: string | null } | null;
  services: { service_type: string; price: number; is_active: boolean; deleted_at: string | null }[];
  reviews: { count: number }[];
};

function toSitterRow(row: SitterSearchRow): SitterRow {
  const activeServices = row.services.filter((s) => s.is_active && !s.deleted_at);
  const servicePrices: Record<string, number> = {};
  for (const s of activeServices) {
    if (!(s.service_type in servicePrices) || s.price < servicePrices[s.service_type]) {
      servicePrices[s.service_type] = s.price;
    }
  }

  return {
    id: row.id,
    display_area: row.display_area,
    latitude: row.latitude,
    longitude: row.longitude,
    base_price: row.base_price,
    rating: row.rating,
    display_name: row.users?.full_name ?? null,
    profile_image: row.users?.profile_image ?? null,
    service_types: [...new Set(activeServices.map((s) => s.service_type))],
    service_prices: servicePrices,
    review_count: row.reviews[0]?.count ?? 0,
  };
}

export async function getSitterList(): Promise<SitterRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sitters")
    .select(
      `id, display_area, latitude, longitude, base_price, rating,
       users!inner ( full_name, profile_image, deleted_at ),
       services ( service_type, price, is_active, deleted_at ),
       reviews ( count )`,
    )
    .eq("status", SITTER_STATUS.APPROVED)
    .filter("users.deleted_at", "is", null);

  if (error || !data) return [];
  return (data as unknown as SitterSearchRow[]).map(toSitterRow);
}
