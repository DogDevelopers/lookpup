import { createClient } from "@/lib/supabase/server";
import { REQUEST_STATUS } from "@/lib/constants";
import { SERVICE_TYPES } from "./constants";
import { mapPetRow } from "./constants";
import type {
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

function formatRelativeTime(dateStr: string): string {
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
  created_at: string;
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
  };
}

export async function getRequestList(): Promise<PostListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, title, content, request_type, location, budget, start_datetime, end_datetime, created_at",
    )
    .neq("status", REQUEST_STATUS.CANCELED)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(toPostListItem);
}

export async function getRequestDetail(id: string): Promise<RequestDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, owner_id, title, content, start_datetime, end_datetime, budget, location, latitude, longitude, status, view_count, created_at, image_urls,
       users:owner_id ( full_name, profile_image, is_verified, created_at ),
       pets:pet_id ( id, name, animal_type, breed ),
       applications ( id, message, proposed_price, status, sitters ( id, users:user_id ( full_name, profile_image ) ) )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as RequestDetail;
}

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
       applications ( status, sitters ( users:user_id ( full_name ) ) ),
       reservations ( status )`,
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as MyRequestRow[];
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
