import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_STATUS } from "@/lib/constants";
import { fetchPublicProfiles } from "@/lib/public-profiles";
import { SERVICE_TYPES } from "./constants";
import { mapPetRow } from "./constants";
import type {
  Application,
  Pet,
  PostListItem,
  PostData,
  RequestDetail,
  OtherPost,
  MyRequestRow,
} from "./types";

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return "기간 협의";
  const s = new Date(start);
  const sStr = `${s.getMonth() + 1}월 ${s.getDate()}일`;
  if (!end) return sStr;
  const e = new Date(end);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  return sameDay ? `${sStr} (당일)` : `${sStr} - ${e.getMonth() + 1}월 ${e.getDate()}일`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

type RequestListRow = {
  id: string;
  title: string;
  content: string | null;
  request_type: string | null;
  location: string | null;
  budget: number | null;
  start_datetime: string | null;
  end_datetime: string | null;
  created_at: string | null;
  status: string;
};

function toPostListItem(row: RequestListRow): PostListItem {
  const category =
    SERVICE_TYPES.find((s) => s.value === row.request_type)?.label ?? "기타";
  return {
    id: row.id,
    category,
    title: row.title,
    desc: row.content ?? "",
    location: row.location ?? "위치 미정",
    period: formatPeriod(row.start_datetime, row.end_datetime),
    price: row.budget ? `${row.budget.toLocaleString()}원` : "협의 가능",
    createdAt: formatRelativeTime(row.created_at),
    status: row.status,
  };
}

export async function getRequestList(): Promise<PostListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, title, content, request_type, location, budget, start_datetime, end_datetime, created_at, status",
    )
    .neq("status", REQUEST_STATUS.CANCELED)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(toPostListItem);
}

// generateMetadata와 page가 같은 요청에서 각각 호출하므로 cache로 한 번만 조회한다.
export const getRequestDetail = cache(async (id: string): Promise<RequestDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, owner_id, title, content, start_datetime, end_datetime, budget, location, latitude, longitude, status, view_count, created_at, image_urls,
       pets:pet_id ( id, name, animal_type, breed ),
       applications ( id, message, proposed_price, status, sitters ( id, user_id ) )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as Omit<RequestDetail, "users" | "applications"> & {
    applications: (Omit<Application, "sitters"> & { sitters: { id: string; user_id: string } | null })[];
  };

  const profiles = await fetchPublicProfiles(supabase, [
    row.owner_id,
    ...row.applications.map((app) => app.sitters?.user_id),
  ]);
  const owner = profiles.get(row.owner_id);

  return {
    ...row,
    users: owner
      ? {
          full_name: owner.full_name,
          profile_image: owner.profile_image,
          is_verified: owner.is_verified,
          created_at: owner.created_at,
        }
      : null,
    applications: row.applications.map((app) => {
      const sitterProfile = app.sitters ? profiles.get(app.sitters.user_id) : undefined;
      return {
        ...app,
        sitters: app.sitters
          ? {
              id: app.sitters.id,
              users: sitterProfile
                ? { full_name: sitterProfile.full_name, profile_image: sitterProfile.profile_image }
                : null,
            }
          : null,
      };
    }),
  };
});

export async function getOtherPostsByOwner(
  ownerId: string,
  excludeId: string,
): Promise<OtherPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("id, title, location, budget, status, created_at")
    .eq("owner_id", ownerId)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data) return [];
  return data as OtherPost[];
}

export async function getRequestForEdit(id: string): Promise<PostData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "status, request_type, budget, start_datetime, end_datetime, content, location, latitude, longitude, title, image_urls, pets:pet_id ( id )",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PostData;
}

export async function getMyRequests(): Promise<MyRequestRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, title, status, request_type, start_datetime, end_datetime, budget, location, created_at,
       pets:pet_id ( name, animal_type ),
       applications ( status, sitters ( user_id ) ),
       reservations ( status )`,
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as (Omit<MyRequestRow, "applications"> & {
    applications: { status: string; sitters: { user_id: string } | null }[];
  })[];

  const profiles = await fetchPublicProfiles(
    supabase,
    rows.flatMap((row) => row.applications.map((app) => app.sitters?.user_id)),
  );

  return rows.map((row) => ({
    ...row,
    applications: row.applications.map((app) => ({
      status: app.status,
      sitters: app.sitters
        ? { users: { full_name: profiles.get(app.sitters.user_id)?.full_name ?? null } }
        : null,
    })),
  }));
}

export async function getUserPets(userId: string): Promise<Pet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, animal_type, age, weight, image_url")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapPetRow);
}
