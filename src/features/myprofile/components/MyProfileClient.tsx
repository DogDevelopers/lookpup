"use client";

import Link from "next/link";
import {
  ChevronRight,
  Dog,
  Calendar,
  FileText,
  Settings,
  Star,
  Wallet,
  AlertTriangle,
  UserX,
  Sparkles,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import SectionCard from "@/components/common/SectionCard";
import type { MyProfileUser } from "@/features/myprofile/types";

type MenuItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string | null;
};

const OWNER_MENU: MenuItem[] = [
  { id: "pets", icon: Dog, label: "반려동물 관리", href: "/myprofile/mypets" },
  { id: "bookings", icon: Calendar, label: "예약 내역", href: "/myprofile/booking-history" },
  { id: "posts", icon: FileText, label: "게시글 관리", href: null },
  { id: "reviews", icon: Star, label: "후기 관리", href: null },
  { id: "settings", icon: Settings, label: "설정", href: "/myprofile/settings" },
  { id: "report", icon: AlertTriangle, label: "신고하기", href: null },
  { id: "withdraw", icon: UserX, label: "회원탈퇴", href: "/myprofile/settings/withdraw" },
];

const SITTER_MENU: MenuItem[] = [
  { id: "sitter-profile", icon: Sparkles, label: "시터 프로필", href: null },
  { id: "bookings", icon: Calendar, label: "예약 내역", href: "/myprofile/booking-history" },
  { id: "reviews", icon: Star, label: "후기 관리", href: null },
  { id: "earnings", icon: Wallet, label: "정산 관리", href: null },
  { id: "settings", icon: Settings, label: "설정", href: "/myprofile/settings" },
  { id: "report", icon: AlertTriangle, label: "신고하기", href: null },
  { id: "withdraw", icon: UserX, label: "회원탈퇴", href: "/myprofile/settings/withdraw" },
];

export default function MyProfileClient({ user }: { user: MyProfileUser }) {
  const isSitter = user.role === "both" || user.role === "admin";
  const menu = isSitter ? SITTER_MENU : OWNER_MENU;

  return (
    <div className="w-full max-w-[720px] mx-auto px-5 py-8 flex flex-col gap-5">
      <SectionCard className="flex-row items-center gap-4">
        <Avatar initial={user.fullName?.charAt(0) ?? "?"} src={user.profileImage} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-stone-900 text-lg font-bold truncate">{user.fullName || "사용자"}</p>
            {user.isVerified && (
              <span className="px-1.5 h-5 rounded-sm bg-orange-500 flex items-center text-white text-[10px] font-normal leading-4 shrink-0">
                인증
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm truncate">{user.email}</p>
        </div>
      </SectionCard>

      {!isSitter && (
        <Link
          href="/sitter-register"
          className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between hover:bg-orange-100/60 transition-colors"
        >
          <span className="text-sm font-medium text-stone-900">펫시터로 활동해보세요</span>
          <ChevronRight size={18} className="text-orange-500" />
        </Link>
      )}

      <SectionCard className="p-2 gap-0">
        {menu.map(({ id, icon: Icon, label, href }) => {
          const disabled = !href;
          const row = (
            <div
              className={`w-full px-3 py-3.5 flex items-center gap-3 rounded-xl transition-colors ${
                disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-50"
              }`}
            >
              <span className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={16} className="text-orange-500" />
              </span>
              <span className="flex-1 text-sm font-medium text-stone-900">{label}</span>
              {disabled ? (
                <span className="text-[11px] text-gray-400">준비 중</span>
              ) : (
                <ChevronRight size={16} className="text-gray-300" />
              )}
            </div>
          );

          if (disabled) {
            return (
              <div key={id} aria-disabled="true">
                {row}
              </div>
            );
          }

          return (
            <Link key={id} href={href}>
              {row}
            </Link>
          );
        })}
      </SectionCard>
    </div>
  );
}
