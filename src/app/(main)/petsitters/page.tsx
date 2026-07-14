import { Suspense } from "react";
import PetsitterSearchClient from "@/features/petsitters/components/PetsitterSearchClient";
import { Spinner } from "@/components/ui/spinner";

// TODO: features/petsitters/queries.ts로 실제 시터 목록을 조회해 initialSitters로 전달.
export default function PetsittersPage() {
  return (
    <Suspense fallback={<Spinner className="size-6 mx-auto mt-20" />}>
      <PetsitterSearchClient />
    </Suspense>
  );
}
