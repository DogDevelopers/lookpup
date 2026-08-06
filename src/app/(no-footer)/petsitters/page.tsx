import { Suspense } from "react";
import PetsitterSearchClient from "@/features/petsitters/components/PetsitterSearchClient";
import { getSitterList } from "@/features/petsitters/queries";
import { publicPage } from "@/lib/metadata";
import { Spinner } from "@/components/ui/spinner";

// 지도 + searchParams 조합이 무한하므로 canonical 하나로 정리한다.
export const metadata = publicPage({
  title: "펫시터 찾기",
  description: "지도에서 우리 동네 펫시터를 찾고, 서비스·가격·평점으로 조건에 맞게 걸러보세요.",
  path: "/petsitters",
});

async function PetsitterSearch() {
  const sitters = await getSitterList();
  return <PetsitterSearchClient initialSitters={sitters} />;
}

export default function PetsittersPage() {
  return (
    <Suspense fallback={<Spinner className="size-6 mx-auto mt-20" />}>
      <PetsitterSearch />
    </Suspense>
  );
}
