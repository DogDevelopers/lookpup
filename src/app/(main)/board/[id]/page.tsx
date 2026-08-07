import type { Metadata } from "next";
import BoardDetailClient from "@/features/board/components/BoardDetailClient";
import { getRequestDetail, getOtherPostsByOwner } from "@/features/board/queries";
import { incrementRequestViewCount } from "@/features/board/actions";
import { publicPage } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getRequestDetail(id);
  if (!post) return { title: "구인글을 찾을 수 없습니다", robots: { index: false } };

  const summary = post.content?.replace(/\s+/g, " ").trim() ?? "";
  const meta = publicPage({
    title: post.title,
    description: summary
      ? `${post.location} · ${summary.slice(0, 120)}`
      : `${post.location}에서 반려동물을 돌봐줄 펫시터를 찾고 있습니다.`,
    path: `/board/${id}`,
  });

  return post.image_urls.length
    ? { ...meta, openGraph: { ...meta.openGraph, images: post.image_urls } }
    : meta;
}

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await incrementRequestViewCount(id);

  const post = await getRequestDetail(id);
  const otherPosts = post ? await getOtherPostsByOwner(post.owner_id, id) : [];

  let isSitter = false;
  let isUnapprovedSitter = false;
  if (user) {
    const { data: sitter } = await supabase
      .from("sitters")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    isSitter = !!sitter;
    isUnapprovedSitter = !!sitter && sitter.status !== "approved";
  }

  return (
    <BoardDetailClient
      initialPost={post}
      initialOtherPosts={otherPosts}
      currentUserId={user?.id}
      isLoggedIn={!!user}
      isSitter={isSitter}
      isUnapprovedSitter={isUnapprovedSitter}
    />
  );
}
