import Link from "next/link";
import EarningsClient from "@/features/earnings/components/EarningsClient";
import { buildMockEarnings, type MockEarningsScenario } from "@/features/earnings/mock";

const SCENARIOS: { id: MockEarningsScenario; label: string }[] = [
  { id: "full", label: "데이터 있음 (기본)" },
  { id: "empty", label: "데이터 없음" },
  { id: "no-account", label: "계좌 미등록" },
  { id: "zero-balance", label: "출금 가능 금액 0원" },
];

export default async function EarningsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = typeof params.state === "string" ? params.state : "full";
  const scenario: MockEarningsScenario = SCENARIOS.some((s) => s.id === raw)
    ? (raw as MockEarningsScenario)
    : "full";

  return (
    <div>
      <div className="sticky top-0 z-50 bg-stone-900 text-white px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-stone-400 mr-1">미리보기 시나리오:</span>
        {SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={`/preview-earnings?state=${s.id}`}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              scenario === s.id ? "bg-orange-500 text-white" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <EarningsClient data={buildMockEarnings(scenario)} />
    </div>
  );
}
