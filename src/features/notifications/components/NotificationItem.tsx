"use client";

import { useRouter } from "next/navigation";
import { getNotificationIcon } from "@/lib/notification-icons";

type Props = {
  id: string;
  type: string;
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  linkUrl: string | null;
  last?: boolean;
  onRead?: (id: string) => void;
};

function getFallbackLink(type: string): string | null {
  switch (type) {
    case "application":
    case "application_selected":
    case "application_rejected":
    case "message":
      return "/chat";
    case "review":
    case "review_received":
      return "/myprofile/reviews";
    case "care_record":
      return "/myprofile/booking-history";
    default:
      return null;
  }
}

export function NotificationItem({ id, type, title, content, time, isRead, linkUrl, last, onRead }: Props) {
  const router = useRouter();
  const { icon, iconBg } = getNotificationIcon(type);
  const effectiveLinkUrl = linkUrl ?? getFallbackLink(type);

  function handleClick() {
    if (!isRead) onRead?.(id);
    if (effectiveLinkUrl) router.push(effectiveLinkUrl);
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`relative px-5 py-4 flex items-start gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 first:rounded-t-2xl last:rounded-b-2xl ${
        !last ? "border-b border-orange-100" : ""
      } ${isRead ? "bg-white/60" : "bg-white"} ${
        effectiveLinkUrl ? "hover:bg-orange-50/40 cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="relative shrink-0 mt-0.5">
        <div
          className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${
            isRead ? "opacity-70" : ""
          }`}
        >
          {icon}
        </div>
        {!isRead && (
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-5 ${isRead ? "text-gray-500" : "text-stone-900 font-medium"}`}>
          {title}
        </p>
        <p className="text-xs text-gray-500 leading-4 mt-0.5 truncate">{content}</p>
        <p className="text-xs text-gray-400 leading-4 mt-1">{time}</p>
      </div>
    </div>
  );
}
