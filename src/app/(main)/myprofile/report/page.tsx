import { Suspense } from "react";
import ReportClient from "@/features/report/components/ReportClient";
import { Spinner } from "@/components/ui/spinner";

export default function ReportPage() {
  return (
    <Suspense fallback={<Spinner className="size-6 mx-auto mt-20" />}>
      <ReportClient />
    </Suspense>
  );
}
