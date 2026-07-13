import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import RestoreForm from "@/features/auth/components/RestoreForm";

const RESTORE_NOTES = [
  "기존 반려동물 정보가 복구됩니다",
  "이전 예약 및 후기 기록이 유지됩니다",
  "보안을 위해 본인인증을 다시 진행해야 합니다",
];

export default function RestorePage() {
  return (
    <div className="w-full max-w-[460px] flex flex-col items-start">
      <div className="w-full flex flex-col items-center gap-2 mb-8">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="봐주개"
            width={160}
            height={48}
            className="object-contain h-auto"
          />
        </Link>
        <p className="text-gray-500 text-base">반려동물 돌봄 플랫폼</p>
      </div>

      <div className="w-full p-8 bg-white rounded-2xl shadow-[0px_2px_12px_0px_rgba(232,116,42,0.10)] border border-orange-100 flex flex-col">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-orange-500" />
          </div>
          <div>
            <h1 className="font-semibold text-stone-900 mb-1">탈퇴된 계정입니다</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              이전에 탈퇴하신 계정으로 로그인하셨습니다. 계정을 복구하면
              기존 데이터를 유지한 채로 계속 이용하실 수 있습니다.
            </p>
          </div>
        </div>

        <ul className="space-y-2 pl-1 mb-6">
          {RESTORE_NOTES.map((text) => (
            <li key={text} className="flex items-start gap-2 text-sm text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
              {text}
            </li>
          ))}
        </ul>

        <RestoreForm />
      </div>
    </div>
  );
}
