import { AlertTriangle } from "lucide-react";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("이용 제한 안내");

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ until?: string }>;
}) {
  const { until } = await searchParams;
  const untilText = until
    ? new Date(until).toLocaleString("ko-KR")
    : undefined;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 via-stone-50/50 to-white px-5 py-16">
      <div className="w-full max-w-[460px] p-8 bg-white rounded-2xl shadow-[0px_2px_12px_0px_rgba(232,116,42,0.10)] border border-orange-100 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
          <AlertTriangle size={24} className="text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-stone-900">이용이 정지된 계정입니다</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {untilText
            ? `${untilText}까지 서비스 이용이 제한됩니다.`
            : "서비스 이용이 제한된 상태입니다."}
          {" "}
          문의사항은 고객센터로 연락해주세요.
        </p>
      </div>
    </main>
  );
}
