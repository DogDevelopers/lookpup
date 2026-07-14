import { Suspense } from "react";
import PetsitterSearchClient from "@/features/petsitters/components/PetsitterSearchClient";
import { getSitterList } from "@/features/petsitters/queries";
import { Spinner } from "@/components/ui/spinner";

export default async function PetsittersPage() {
  const sitters = await getSitterList();
  return (
    <Suspense fallback={<Spinner className="size-6 mx-auto mt-20" />}>
      <PetsitterSearchClient initialSitters={sitters} />
    </Suspense>
  );
}
