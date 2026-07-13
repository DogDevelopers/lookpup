import Link from "next/link";
import { Pencil } from "lucide-react";
import { getMySitterProfile } from "@/features/sitter-register/actions";
import SitterDetailClient from "@/features/petsitters/components/SitterDetailClient";

export default async function SitterProfilePreviewPage() {
  const sitter = await getMySitterProfile();

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-10 flex items-center justify-between">
        <span className="text-sm text-gray-500">이 페이지는 미리보기입니다</span>
        {sitter && (
          <Link
            href="/myprofile/sitter-edit"
            className="h-9 px-4 rounded-xl border border-orange-500 text-orange-500 text-sm font-medium flex items-center gap-1.5 hover:bg-orange-50 transition-colors"
          >
            <Pencil size={14} />
            프로필 수정
          </Link>
        )}
      </div>

      <SitterDetailClient sitterId={sitter?.id ?? ""} sitter={sitter} isError={!sitter} />
    </div>
  );
}
