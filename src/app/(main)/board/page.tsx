import { Suspense } from "react";
import BoardListClient from "@/features/board/components/BoardListClient";
import { getRequestList } from "@/features/board/queries";
import { publicPage } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";
import { Spinner } from "@/components/ui/spinner";

export const metadata = publicPage({
  title: "펫시터 구인 게시판",
  description: "보호자가 직접 올린 돌봄 요청을 확인하고, 조건이 맞는 구인글에 지원해 보세요.",
  path: "/board",
});

export default async function BoardPage() {
  const supabase = await createClient();
  const [
    posts,
    {
      data: { user },
    },
  ] = await Promise.all([getRequestList(), supabase.auth.getUser()]);

  return (
    <Suspense fallback={<Spinner className="size-6 mx-auto mt-20" />}>
      <BoardListClient posts={posts} isLoggedIn={!!user} />
    </Suspense>
  );
}
