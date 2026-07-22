"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Dog,
  Calendar,
  ClipboardList,
  FileText,
  HelpCircle,
  Star,
  Wallet,
  BookOpen,
  User,
  UserX,
  Pencil,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Pill from "@/components/ui/Pill";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import SectionCard from "@/components/common/SectionCard";
import { clientEnv } from "@/lib/env";
import LocationEditModal from "@/features/myprofile/components/LocationEditModal";
import BookingHistoryClient from "@/features/petsitters/components/BookingHistoryClient";
import WorksHistoryClient from "@/features/petsitters/components/WorksHistoryClient";
import ReviewsClient from "@/features/reviews/components/ReviewsClient";
import MyPetsClient, {
  type MyPet,
} from "@/features/pet-register/components/MyPetsClient";
import MyPostsClient from "@/features/board/components/MyPostsClient";
import EarningsClient from "@/features/earnings/components/EarningsClient";
import EarningsSummaryCard from "@/features/earnings/components/EarningsSummaryCard";
import type {
  MyProfileUser,
  MyProfileSitterSummary,
} from "@/features/myprofile/types";
import type { EarningsData } from "@/features/earnings/types";
import type {
  MyReservation,
  MySitterReservation,
} from "@/features/reservations/types";
import type { MyRequestRow } from "@/features/board/types";
import type { WrittenReview, ReceivedReview } from "@/features/reviews/types";

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  dong: string;
}

type Role = "owner" | "sitter";

interface MenuItem {
  id: string;
  icon: React.ElementType;
  label: string;
  kind: "view" | "link";
  href?: string;
}

const OWNER_MENU: MenuItem[] = [
  { id: "pets", icon: Dog, label: "내 반려동물", kind: "view" },
  { id: "bookings", icon: Calendar, label: "예약 목록", kind: "view" },
  { id: "reviews", icon: BookOpen, label: "작성한 후기", kind: "view" },
  { id: "posts", icon: FileText, label: "게시글 관리", kind: "view" },
  {
    id: "terms",
    icon: HelpCircle,
    label: "이용약관",
    kind: "link",
    href: "/terms",
  },
  {
    id: "withdraw",
    icon: UserX,
    label: "회원 탈퇴",
    kind: "link",
    href: "/myprofile/settings/withdraw",
  },
];

const SITTER_MENU: MenuItem[] = [
  { id: "profile", icon: User, label: "펫시터 프로필", kind: "view" },
  { id: "works", icon: ClipboardList, label: "예약 관리", kind: "view" },
  { id: "reviews", icon: BookOpen, label: "받은 후기", kind: "view" },
  { id: "earnings", icon: Wallet, label: "수익 관리", kind: "view" },
  {
    id: "terms",
    icon: HelpCircle,
    label: "이용약관",
    kind: "link",
    href: "/terms",
  },
  {
    id: "withdraw",
    icon: UserX,
    label: "회원 탈퇴",
    kind: "link",
    href: "/myprofile/settings/withdraw",
  },
];

const ICON_COLOR: Record<Role, string> = {
  owner: "var(--color-orange-300)",
  sitter: "var(--color-orange-500)",
};

const ROLE_ACTIVE_BG: Record<Role, string> = {
  owner: "bg-[var(--color-orange-300)]",
  sitter: "bg-orange-500",
};

const ROLE_CONTENT_BOX: Record<Role, string> = {
  owner:
    "rounded-2xl border border-[var(--color-orange-300)]/20 shadow-[0px_2px_12px_0px_rgba(253,186,116,0.10)] p-5",
  sitter:
    "rounded-2xl border border-orange-100 shadow-[0px_2px_12px_0px_rgba(232,116,42,0.10)] p-5",
};

const ROLE_ACCENT: Record<Role, { text: string; bg: string; bar: string }> = {
  owner: {
    text: "text-[var(--color-orange-300)]",
    bg: "bg-[var(--color-orange-300)]/10",
    bar: "bg-[var(--color-orange-300)]",
  },
  sitter: { text: "text-orange-500", bg: "bg-orange-50", bar: "bg-orange-500" },
};

function MenuIcon({
  icon: Icon,
  size,
  color,
}: {
  icon: React.ElementType;
  size: number;
  color: string;
}) {
  return <Icon size={size} color={color} />;
}

function SidebarItem({
  item,
  role,
  selected,
  onClick,
}: {
  item: MenuItem;
  role: Role;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const accent = ROLE_ACCENT[role];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
        selected
          ? `${accent.bg} ${accent.text}`
          : "text-gray-500 hover:bg-gray-50 hover:text-stone-900"
      }`}
    >
      {selected && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${accent.bar}`}
        />
      )}
      <MenuIcon icon={Icon} size={16} color={ICON_COLOR[role]} />
      <span
        className={`text-sm font-medium ${selected ? accent.text : "text-stone-900"}`}
      >
        {item.label}
      </span>
    </button>
  );
}

function IconHoverAction({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={150} closeDelay={80} render={children} />
      <HoverCardContent
        align="end"
        sideOffset={8}
        className="w-auto rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white"
      >
        {label}
      </HoverCardContent>
    </HoverCard>
  );
}

function IdentityHeader({
  name,
  profileImage,
  isVerified,
  location,
  onEditLocation,
  locationLabel,
}: {
  name: string;
  profileImage: string | null;
  isVerified: boolean;
  location: string;
  onEditLocation: () => void;
  locationLabel: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <Avatar
        initial={name.charAt(0) || "?"}
        src={profileImage}
        size="lg"
        variant="orange"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-bold text-stone-900 truncate">{name}</h2>
          {isVerified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500">
              <BadgeCheck size={11} /> 인증완료
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={12} className="text-gray-400" />
          <span
            className={`text-xs ${location ? "text-gray-500" : "text-gray-300"}`}
          >
            {location || "위치 미등록"}
          </span>
        </div>
      </div>
      <IconHoverAction label={locationLabel}>
        <button
          type="button"
          onClick={onEditLocation}
          aria-label={locationLabel}
          className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 shrink-0"
        >
          <MapPin size={16} />
        </button>
      </IconHoverAction>
    </div>
  );
}

function SitterProfileView({
  name,
  profileImage,
  location,
  sitter,
}: {
  name: string;
  profileImage: string | null;
  location: string;
  sitter: MyProfileSitterSummary | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Avatar
          initial={name.charAt(0) || "?"}
          src={profileImage}
          size="xl"
          variant="orange"
        />
        <div className="flex-1 min-w-0 pt-1">
          <h2 className="text-lg font-bold text-stone-900 truncate">{name}</h2>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500">
              {location || "위치 미등록"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <IconHoverAction label="프로필 미리보기">
            <Link
              href="/myprofile/sitter-profile"
              aria-label="프로필 미리보기"
              className="flex size-9 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-500 transition-colors hover:bg-orange-100"
            >
              <User size={16} />
            </Link>
          </IconHoverAction>
          <IconHoverAction label="시터 정보 수정">
            <Link
              href="/myprofile/sitter-edit"
              aria-label="시터 정보 수정"
              className="flex size-9 items-center justify-center rounded-full bg-orange-500 text-white transition-colors hover:bg-orange-600"
            >
              <Pencil size={16} />
            </Link>
          </IconHoverAction>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-stone-900">
              {sitter?.rating.toFixed(1) ?? "-"}
            </span>
          </div>
          <span className="text-[11px] text-gray-400">평점</span>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-sm font-bold text-stone-900 mb-0.5">
            {sitter ? `${sitter.reviewCount}건` : "-"}
          </div>
          <span className="text-[11px] text-gray-400">완료 건수</span>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-stone-900 mb-0.5">
            {sitter?.career ?? "-"}
          </div>
          <span className="text-[11px] text-gray-400">경력</span>
        </div>
      </div>

      {!!sitter?.services.length && (
        <div className="flex gap-2 flex-wrap">
          {[...new Set(sitter.services)].map((s) => (
            <Pill key={s}>{s}</Pill>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyProfileClient({
  user,
  sitter,
  bookings,
  works,
  pets,
  posts,
  writtenReviews,
  receivedReviews,
  earnings,
}: {
  user: MyProfileUser;
  sitter: MyProfileSitterSummary | null;
  bookings: MyReservation[];
  works: MySitterReservation[];
  pets: MyPet[];
  posts: MyRequestRow[];
  writtenReviews: WrittenReview[];
  receivedReviews: ReceivedReview[];
  earnings: EarningsData;
}) {
  const isSitter = user.role === "both" || user.role === "admin";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role: Role = isSitter && searchParams.get("role") === "sitter" ? "sitter" : "owner";
  const defaultMenu = role === "owner" ? "pets" : "profile";
  const selectedMenu = searchParams.get("menu") || defaultMenu;

  const navigate = (nextRole: Role, nextMenu: string) => {
    const params = new URLSearchParams();
    if (nextRole === "sitter") params.set("role", "sitter");
    if (nextMenu !== (nextRole === "owner" ? "pets" : "profile")) {
      params.set("menu", nextMenu);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const [locationData, setLocationData] = useState<LocationData | null>(
    user.address && user.latitude != null && user.longitude != null
      ? {
          address: user.address,
          lat: user.latitude,
          lng: user.longitude,
          dong: user.displayArea || user.address,
        }
      : null,
  );
  const [showLocationModal, setShowLocationModal] = useState(false);

  const name = user.fullName || "이름 미등록";
  const location = locationData?.dong || "위치 미등록";
  const menuItems = role === "owner" ? OWNER_MENU : SITTER_MENU;

  const handleRoleChange = (next: Role) => {
    navigate(next, next === "owner" ? "pets" : "profile");
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.kind === "view") {
      navigate(role, item.id);
    }
  };

  const identity = (
    <IdentityHeader
      name={name}
      profileImage={user.profileImage}
      isVerified={user.isVerified}
      location={location}
      onEditLocation={() => setShowLocationModal(true)}
      locationLabel={locationData ? "위치 수정하기" : "위치 등록하기"}
    />
  );

  const content = (() => {
    if (role === "owner") {
      switch (selectedMenu) {
        case "bookings":
          return <BookingHistoryClient bookings={bookings} embedded />;
        case "reviews":
          return (
            <ReviewsClient
              isSitter={isSitter}
              initialWrittenReviews={writtenReviews}
              initialReceivedReviews={receivedReviews}
              mode="written"
              embedded
            />
          );
        case "posts":
          return <MyPostsClient posts={posts} embedded />;
        default:
          return <MyPetsClient pets={pets} embedded />;
      }
    }

    switch (selectedMenu) {
      case "works":
        return <WorksHistoryClient works={works} embedded />;
      case "reviews":
        return (
          <ReviewsClient
            isSitter={isSitter}
            initialWrittenReviews={writtenReviews}
            initialReceivedReviews={receivedReviews}
            mode="received"
            embedded
          />
        );
      case "earnings":
        return (
          <EarningsClient
            data={earnings}
            embedded
            onViewReservations={() => navigate(role, "works")}
          />
        );
      default:
        return (
          <div className="space-y-4">
            <SitterProfileView
              name={name}
              profileImage={user.profileImage}
              location={location}
              sitter={sitter}
            />
            <EarningsSummaryCard
              data={earnings}
              onViewDetail={() => navigate("sitter", "earnings")}
            />
          </div>
        );
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${clientEnv.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onLoad={() => window.kakao.maps.load(() => {})}
      />

      <LocationEditModal
        open={showLocationModal}
        initialData={locationData}
        onClose={() => setShowLocationModal(false)}
        onSave={(data) => setLocationData(data)}
      />

      <div className="hidden md:block flex-1">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-10 py-12">
          <div className="flex gap-6">
            <div className="w-72 shrink-0">
              <SectionCard
                className={`sticky top-24 gap-0 overflow-hidden ${
                  role === "owner"
                    ? "border-[var(--color-orange-300)]/20 shadow-[0px_2px_12px_0px_rgba(253,186,116,0.10)]"
                    : ""
                }`}
              >
                <div className="pb-4 mb-3 border-b border-gray-100">
                  {identity}
                </div>

                {isSitter && (
                  <div className="flex bg-gray-50 rounded-full p-1 mb-3">
                    {(["owner", "sitter"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`flex-1 py-2 rounded-full text-sm transition-all ${
                          role === r
                            ? `${ROLE_ACTIVE_BG[r]} text-white`
                            : "text-gray-500"
                        }`}
                      >
                        {r === "owner" ? "보호자" : "펫시터"}
                      </button>
                    ))}
                  </div>
                )}

                <nav className="space-y-0.5 pt-1">
                  {menuItems.map((item) =>
                    item.kind === "link" ? (
                      <Link key={item.id} href={item.href!} className="block">
                        <SidebarItem
                          item={item}
                          role={role}
                          selected={false}
                          onClick={() => {}}
                        />
                      </Link>
                    ) : (
                      <SidebarItem
                        key={item.id}
                        item={item}
                        role={role}
                        selected={selectedMenu === item.id}
                        onClick={() => handleMenuClick(item)}
                      />
                    ),
                  )}
                </nav>
              </SectionCard>
            </div>

            <div className="flex-1 min-w-0 space-y-5">
              <div className={ROLE_CONTENT_BOX[role]}>{content}</div>

              {!isSitter && role === "owner" && (
                <Link href="/sitter-register">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl p-7 flex items-center justify-between hover:opacity-90 transition-opacity">
                    <div>
                      <h3 className="font-bold text-white text-lg mb-1">
                        펫시터로 활동하기
                      </h3>
                      <p className="text-white/80 text-sm">
                        추가 수입을 만들어보세요
                      </p>
                    </div>
                    <ChevronRight size={32} className="text-white" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="px-5 pt-8 pb-5 border-b border-gray-100">
          {identity}

          {isSitter && (
            <div className="flex bg-gray-50 rounded-full p-1 mt-4">
              {(["owner", "sitter"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    role === r
                      ? `${ROLE_ACTIVE_BG[r]} text-white`
                      : "text-gray-500"
                  }`}
                >
                  {r === "owner" ? "보호자" : "펫시터"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-5 bg-gray-50 border border-gray-100 rounded-2xl p-1">
            {menuItems
              .filter((item) => item.kind === "view")
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className={`flex-1 min-w-fit px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    selectedMenu === item.id
                      ? `${ROLE_ACTIVE_BG[role]} text-white`
                      : "text-gray-500"
                  }`}
                >
                  {item.label}
                </button>
              ))}
          </div>

          <div className={ROLE_CONTENT_BOX[role]}>{content}</div>

          <div className="mt-6 space-y-2">
            {menuItems
              .filter((item) => item.kind === "link")
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href!}
                    className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm border border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 border border-gray-100">
                      <MenuIcon
                        icon={Icon}
                        size={20}
                        color={ICON_COLOR[role]}
                      />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-stone-900">
                      {item.label}
                    </span>
                    <ChevronRight size={18} className="text-gray-400" />
                  </Link>
                );
              })}
          </div>

          {!isSitter && (
            <Link href="/sitter-register">
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl p-5 mt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-0.5">
                      펫시터로 활동하기
                    </h4>
                    <p className="text-xs text-white/80">
                      추가 수입을 만들어보세요
                    </p>
                  </div>
                  <ChevronRight size={28} className="text-white" />
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
