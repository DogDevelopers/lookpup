import { Suspense } from "react";
import ReportClient from "@/features/report/components/ReportClient";

export default function ReportPage() {
  return (
    <Suspense>
      <ReportClient />
    </Suspense>
  );
}
