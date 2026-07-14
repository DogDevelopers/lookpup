import { Suspense } from "react";
import BoardListClient from "@/features/board/components/BoardListClient";
import { getRequestList } from "@/features/board/queries";
import { createClient } from "@/lib/supabase/server";
import { Spinner } from "@/components/ui/spinner";

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
