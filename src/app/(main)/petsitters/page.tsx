import { Suspense } from "react";
import PetsitterSearchClient from "@/features/petsitters/components/PetsitterSearchClient";

// TODO: features/petsitters/queries.ts로 실제 시터 목록을 조회해 initialSitters로 전달.
export default function PetsittersPage() {
  return (
    <Suspense>
      <PetsitterSearchClient />
    </Suspense>
  );
}
