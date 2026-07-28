"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { fuzzCoordinate, syncLocationAcrossProfiles } from "@/lib/geo";
import { SERVICES } from "@/lib/sitter-options";
import {
  createSitterSchema,
  updateSitterProfileSchema,
  type CreateSitterInput,
  type UpdateSitterProfileInput,
} from "@/features/sitter-register/schema";
import type { SitterDetail, ServiceRow } from "@/features/petsitters/types";

type ActionResult = { ok: true } | { ok: false; error: string };

const DEFAULT_SERVICE_PRICE = 10000;

export async function createSitter(input: CreateSitterInput): Promise<ActionResult> {
  const parsed = createSitterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: profile } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_verified) {
    return { ok: false, error: "본인인증 후 펫시터 등록이 가능합니다." };
  }

  const { data: existing } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "이미 펫시터 프로필이 존재합니다." };
  }

  const {
    introduction,
    career,
    location,
    selectedServices,
    selectedAnimals,
    profilePhotoUrl,
    certificateUrls,
    activityPhotoUrls,
  } = parsed.data;

  const { data: sitter, error: sitterError } = await supabase
    .from("sitters")
    .insert({
      user_id: user.id,
      introduction,
      career,
      available_area: location.address,
      display_area: location.displayArea,
      latitude: fuzzCoordinate(location.lat),
      longitude: fuzzCoordinate(location.lng),
      base_price: 0,
      request_type: selectedServices,
      available_animals: selectedAnimals,
      certificate_urls: certificateUrls,
      activity_photo_urls: activityPhotoUrls,
    })
    .select("id")
    .single();

  if (sitterError || !sitter) {
    return { ok: false, error: "펫시터 등록에 실패했습니다." };
  }

  await syncLocationAcrossProfiles(
    supabase,
    user.id,
    {
      address: location.address,
      displayArea: location.displayArea,
      lat: location.lat,
      lng: location.lng,
    },
    "sitters",
  );

  if (profilePhotoUrl) {
    await supabase.from("users").update({ profile_image: profilePhotoUrl }).eq("id", user.id);
  }

  const servicesToInsert = selectedServices.map((serviceId) => {
    const service = SERVICES.find((s) => s.id === serviceId);
    return {
      sitter_id: sitter.id,
      service_type: serviceId,
      title: service?.title ?? serviceId,
      price: DEFAULT_SERVICE_PRICE,
      is_active: true,
    };
  });

  const { error: servicesError } = await supabase.from("services").insert(servicesToInsert);

  if (servicesError) {
    await supabase.from("sitters").delete().eq("id", sitter.id);
    return { ok: false, error: "펫시터 등록에 실패했습니다." };
  }

  await supabase.from("users").update({ role: "both" }).eq("id", user.id);

  revalidatePath("/myprofile");
  return { ok: true };
}

export async function getMySitterProfile(): Promise<SitterDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: row } = await supabase
    .from("sitters")
    .select(
      `id, introduction, career, available_area, display_area, latitude, longitude, base_price, rating, activity_photo_urls, available_animals,
       users!inner(full_name, profile_image, is_verified)`,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return null;

  const [{ count: reviewCount }, serviceRows] = await Promise.all([
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("sitter_id", row.id),
    getSitterServices(row.id),
  ]);

  const owner = row.users as unknown as {
    full_name: string | null;
    profile_image: string | null;
    is_verified: boolean | null;
  } | null;
  const services: ServiceRow[] = serviceRows
    .filter((s) => s.is_active)
    .map((s) => ({
      service_type: s.service_type,
      title: s.title,
      description: s.description,
      price: s.price,
      animal_type: null,
    }));

  return {
    id: row.id,
    is_self: true,
    full_name: owner?.full_name ?? null,
    profile_image: owner?.profile_image ?? null,
    is_verified: owner?.is_verified ?? false,
    introduction: row.introduction,
    career: row.career,
    available_area: row.available_area,
    display_area: row.display_area,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    base_price: row.base_price,
    rating: Number(row.rating ?? 0),
    review_count: reviewCount ?? 0,
    activity_photo_urls: row.activity_photo_urls ?? [],
    available_animals: row.available_animals ?? [],
    services,
  };
}

export interface SitterServiceRow {
  id: string;
  service_type: string;
  title: string;
  description: string | null;
  price: number;
  is_active: boolean;
}

export async function getSitterServices(sitterId: string): Promise<SitterServiceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, service_type, title, description, price, is_active")
    .eq("sitter_id", sitterId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function updateSitterProfile(
  input: UpdateSitterProfileInput,
): Promise<ActionResult> {
  const parsed = updateSitterProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: sitter } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sitter) {
    return { ok: false, error: "펫시터 프로필을 찾을 수 없습니다." };
  }

  const {
    introduction,
    career,
    availableArea,
    displayArea,
    latitude,
    longitude,
    availableAnimals,
    profilePhotoUrl,
    activityPhotoUrls,
    services,
    deletedServiceIds,
  } = parsed.data;

  if (profilePhotoUrl) {
    await supabase.from("users").update({ profile_image: profilePhotoUrl }).eq("id", user.id);
  }

  const { error: updateError } = await supabase
    .from("sitters")
    .update({
      introduction,
      career,
      available_area: availableArea,
      display_area: displayArea ?? null,
      latitude: latitude != null ? fuzzCoordinate(latitude) : null,
      longitude: longitude != null ? fuzzCoordinate(longitude) : null,
      available_animals: availableAnimals,
      activity_photo_urls: activityPhotoUrls,
    })
    .eq("id", sitter.id);

  if (updateError) {
    return { ok: false, error: "프로필 수정에 실패했습니다." };
  }

  if (latitude != null && longitude != null) {
    await syncLocationAcrossProfiles(
      supabase,
      user.id,
      {
        address: availableArea,
        displayArea: displayArea ?? availableArea,
        lat: latitude,
        lng: longitude,
      },
      "sitters",
    );
  }

  if (deletedServiceIds.length > 0) {
    await supabase
      .from("services")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", deletedServiceIds);
  }

  for (const service of services) {
    if (service.id) {
      await supabase
        .from("services")
        .update({
          title: service.title,
          price: service.price,
          description: service.description || null,
        })
        .eq("id", service.id);
      continue;
    }

    const { data: deletedRow } = await supabase
      .from("services")
      .select("id")
      .eq("sitter_id", sitter.id)
      .eq("title", service.title)
      .not("deleted_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (deletedRow) {
      await supabase
        .from("services")
        .update({
          deleted_at: null,
          price: service.price,
          description: service.description || null,
          is_active: true,
        })
        .eq("id", deletedRow.id);
    } else {
      const matchedOption = SERVICES.find((s) => s.title === service.title);
      await supabase.from("services").insert({
        sitter_id: sitter.id,
        service_type: matchedOption?.id ?? service.title,
        title: service.title,
        price: service.price,
        description: service.description || null,
        is_active: true,
      });
    }
  }

  revalidatePath("/myprofile");
  revalidatePath("/myprofile/sitter-profile");
  revalidatePath("/myprofile/sitter-edit");
  return { ok: true };
}
