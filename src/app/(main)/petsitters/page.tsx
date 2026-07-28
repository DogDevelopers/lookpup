import { Suspense } from "react";
import PetsitterSearchClient from "@/features/petsitters/components/PetsitterSearchClient";
import { getSitterList } from "@/features/petsitters/queries";
import { Spinner } from "@/components/ui/spinner";

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
