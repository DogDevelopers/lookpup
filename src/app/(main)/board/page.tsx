import { Suspense } from "react";
import BoardListClient from "@/features/board/components/BoardListClient";

// TODO: features/board/queries.ts로 실데이터 조회해 posts로 전달, 로그인 여부 확인.
export default function BoardPage() {
  return (
    <Suspense>
      <BoardListClient />
    </Suspense>
  );
}
