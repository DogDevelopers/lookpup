"use client";

import { useState, memo } from "react";
import { MoreVertical, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import SitterProfileCard from "./SitterProfileCard";
import type { Badge } from "@/features/chat/types";

type ChatWindowHeaderProps = {
  initial: string;
  src?: string | null;
  name: string;
  sub: string;
  badge: Badge;
  onGoToProfile?: () => void;
  onLeaveChat?: () => void;
  canLeaveChat?: boolean;
  canViewProfile?: boolean;
  onReport?: () => void;
};

function ChatWindowHeaderImpl({
  initial,
  src,
  name,
  sub,
  badge,
  onGoToProfile,
  onLeaveChat,
  canLeaveChat = true,
  canViewProfile = true,
  onReport,
}: ChatWindowHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="h-16 px-8 bg-white border-b border-orange-100 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Avatar initial={initial} src={src} />
        <div>
          <p className="text-stone-900 text-base font-semibold leading-5">
            {name}
          </p>
          <p className="text-stone-400 text-xs mt-0.5">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <MoreVertical size={20} className="text-stone-500" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-orange-100 z-20 overflow-hidden divide-y divide-orange-50">
                {canViewProfile && (
                  <button
                    onClick={() => {
                      onGoToProfile?.();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-orange-50 transition-colors"
                  >
                    프로필 보기
                  </button>
                )}
                {canLeaveChat && (
                  <button
                    onClick={() => {
                      onLeaveChat?.();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-orange-50 transition-colors"
                  >
                    채팅 나가기
                  </button>
                )}
                <button
                  onClick={() => {
                    onReport?.();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  신고하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const ChatWindowHeader = memo(ChatWindowHeaderImpl);

export type ProfilePopupData = {
  sitterId?: string | null;
  name: string;
  initial: string;
  profileImage?: string | null;
  location?: string;
  rating?: number;
  reviewCount?: number;
  services?: string[];
  career?: string;
};

type ProfilePopupProps = {
  data: ProfilePopupData;
  cardVariant?: "sitter" | "owner";
  onClose: () => void;
};

export function ProfilePopup({
  data,
  onClose,
  cardVariant = "sitter",
}: ProfilePopupProps) {
  const profile = {
    name: data.name,
    initial: data.initial,
    src: data.profileImage,
    verified: false,
    location: data.location ?? "",
    rating: data.rating ?? 0,
    reviewCount: data.reviewCount ?? 0,
    services: data.services ?? [],
    career: data.career ?? "",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div className="relative w-80" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-orange-50 transition-colors"
        >
          <X size={16} className="text-stone-400" />
        </button>
        <SitterProfileCard profile={profile} variant={cardVariant} />
      </div>
    </div>
  );
}
