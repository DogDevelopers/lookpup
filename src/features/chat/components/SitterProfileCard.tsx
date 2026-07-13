import { MapPin, Star } from "lucide-react";
import type { ReactNode } from "react";
import Avatar from "@/components/ui/Avatar";
import Pill from "@/components/ui/Pill";

export interface SitterProfile {
  name: string;
  initial: string;
  src?: string | null;
  verified: boolean;
  location: string;
  rating?: number;
  reviewCount?: number;
  services?: string[];
  career?: string;
}

interface Props {
  profile: SitterProfile;
  className?: string;
  variant?: "owner" | "sitter";
  action?: ReactNode;
}

export default function SitterProfileCard({
  profile: p,
  className = "",
  variant = "sitter",
  action,
}: Props) {
  const isSitterCard = variant === "sitter";

  return (
    <div
      className={`bg-white border border-orange-100 rounded-2xl shadow-[0px_2px_12px_0px_rgba(232,116,42,0.08)] overflow-hidden ${className}`}
    >
      <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-300" />

      <div className="p-5 space-y-4">
        <div className="flex gap-4">
          <div className="relative shrink-0">
            <Avatar
              initial={p.initial}
              src={p.src}
              size="lg"
              variant="orange"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-stone-900">
                {p.name}
              </span>
              {isSitterCard ? (
                <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-medium text-white">
                  경력 {p.career ?? "-"}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 mb-1">
              <MapPin size={12} className="text-stone-400" />
              <span
                className={`text-xs ${p.location ? "text-stone-500" : "text-stone-300"}`}
              >
                {p.location || "위치 미등록"}
              </span>
            </div>
            {isSitterCard && (
              <div className="flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-stone-900">
                  {p.rating ?? "-"}
                </span>
                <span className="text-xs text-stone-400">
                  ({p.reviewCount ?? 0}개 리뷰)
                </span>
              </div>
            )}
          </div>

          {action}
        </div>

        {isSitterCard && !!p.services?.length && (
          <div className="flex gap-2 flex-wrap">
            {[...new Set(p.services)].map((s) => (
              <Pill key={s}>{s}</Pill>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
