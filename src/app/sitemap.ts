import type { MetadataRoute } from "next";
import { REQUEST_STATUS } from "@/lib/constants";
import { resolveSiteUrl } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

const STATIC_PATHS = [
  { path: "", priority: 1 },
  { path: "/petsitters", priority: 0.9 },
  { path: "/board", priority: 0.9 },
  { path: "/about", priority: 0.6 },
  { path: "/terms", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    priority,
  }));

  // 시터 상세는 실명·활동 지역이 노출되므로 색인 대상이 아니다(페이지에서 noindex).
  // 모집 중인 구인글만 싣는다 — matched/closed는 수명이 끝나 stale content가 된다.
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("id, updated_at, created_at")
    .eq("status", REQUEST_STATUS.OPEN)
    .order("created_at", { ascending: false })
    .limit(1000);

  const postEntries: MetadataRoute.Sitemap = (data ?? []).map((row) => ({
    url: `${baseUrl}/board/${row.id}`,
    lastModified: new Date(row.updated_at ?? row.created_at ?? now),
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}
