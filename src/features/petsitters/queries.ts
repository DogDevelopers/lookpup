import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { BookedRange, Pet, ReviewRow, SitterBookingInfo, SitterDetail, SitterRow } from "./types";

const ANIMAL_TYPE_LABEL: Record<string, string> = {
  dog: "강아지",
  cat: "고양이",
  other: "기타",
};

export async function getSitterList(): Promise<SitterRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_petsitters_filtered", {});
  if (error || !data) return [];

  const ids = data.map((row) => row.id);
  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("sitter_id")
    .in("sitter_id", ids);

  const reviewCounts: Record<string, number> = {};
  for (const r of reviewRows ?? []) {
    reviewCounts[r.sitter_id] = (reviewCounts[r.sitter_id] ?? 0) + 1;
  }

  return data.map((row) => ({
    id: row.id,
    display_area: row.display_area,
    latitude: row.latitude,
    longitude: row.longitude,
    base_price: row.base_price,
    rating: row.rating,
    display_name: row.display_name,
    profile_image: row.profile_image,
    service_types: row.service_types,
    service_prices: (row.service_prices ?? {}) as Record<string, number>,
    review_count: reviewCounts[row.id] ?? 0,
  }));
}

const sitterBookingRpcSchema = z.object({
  id: z.string(),
  full_name: z.string().nullable(),
  profile_image: z.string().nullable(),
  base_price: z.number().nullable(),
});

export async function getSitterBookingInfo(sitterId: string): Promise<SitterBookingInfo | null> {
  const supabase = await createClient();
  const [{ data, error }, { data: services }] = await Promise.all([
    supabase.rpc("get_petsitter_detail", { p_sitter_id: sitterId }),
    supabase
      .from("services")
      .select("id, service_type, title, price")
      .eq("sitter_id", sitterId)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);
  if (error || !data) return null;

  const parsed = sitterBookingRpcSchema.safeParse(data);
  if (!parsed.success) return null;

  const row = parsed.data;
  const name = row.full_name ?? "시터";

  return {
    id: row.id,
    name,
    initial: name.charAt(0),
    profileImage: row.profile_image,
    pricePerDay: row.base_price ?? 0,
    services: (services ?? []).map((s) => ({
      id: s.id,
      service_type: s.service_type,
      title: s.title ?? s.service_type,
      price: s.price,
    })),
  };
}

const sitterDetailRpcSchema = z.object({
  id: z.string(),
  is_self: z.boolean().nullable(),
  full_name: z.string().nullable(),
  profile_image: z.string().nullable(),
  is_verified: z.boolean(),
  introduction: z.string().nullable(),
  career: z.string().nullable(),
  available_area: z.string().nullable(),
  display_area: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  base_price: z.number().nullable(),
  rating: z.number(),
  review_count: z.number(),
  activity_photo_urls: z.array(z.string()),
  services: z.array(
    z.object({
      service_type: z.string(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      price: z.number(),
      animal_type: z.string().nullable(),
    }),
  ),
});

export async function getSitterDetail(sitterId: string): Promise<SitterDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_petsitter_detail", { p_sitter_id: sitterId });
  if (error || !data) return null;

  const parsed = sitterDetailRpcSchema.safeParse(data);
  if (!parsed.success) return null;

  const { data: sitterRow } = await supabase
    .from("sitters")
    .select("available_animals")
    .eq("id", sitterId)
    .eq("status", "approved")
    .maybeSingle();

  return { ...parsed.data, available_animals: sitterRow?.available_animals ?? [] };
}

export async function getSitterReviews(sitterId: string): Promise<ReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, content, image_urls, tags, created_at, owner_id")
    .eq("sitter_id", sitterId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const ownerIds = [...new Set(data.map((r) => r.owner_id))];
  const { data: owners } = ownerIds.length
    ? await supabase.rpc("get_public_user_profiles", { user_ids: ownerIds })
    : { data: [] };

  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    content: r.content,
    image_urls: r.image_urls,
    tags: r.tags,
    created_at: r.created_at ?? "",
    owner: ownerById.get(r.owner_id)
      ? {
          full_name: ownerById.get(r.owner_id)!.full_name,
          profile_image: ownerById.get(r.owner_id)!.profile_image,
        }
      : null,
  }));
}

export async function getBookedRanges(sitterId: string): Promise<BookedRange[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sitter_booked_ranges", {
    p_sitter_id: sitterId,
  });

  if (error || !data) return [];
  return data.map((r) => ({ from: new Date(r.start_datetime), to: new Date(r.end_datetime) }));
}

type PetRow = {
  id: string;
  name: string;
  animal_type: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  image_url: string | null;
};

export async function getUserPets(userId: string): Promise<Pet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, animal_type, breed, age, weight, image_url")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as PetRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    type: ANIMAL_TYPE_LABEL[p.animal_type] ?? p.animal_type,
    breed: p.breed ?? "",
    age: p.age ?? 0,
    weight: p.weight ?? 0,
    image_url: p.image_url,
  }));
}
