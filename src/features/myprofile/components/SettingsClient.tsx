"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, MapPin, Calendar, Building2, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import SectionCard from "@/components/common/SectionCard";
import { AvatarWithCamera } from "@/components/ui/Avatar";
import { upsertBankAccount } from "@/features/myprofile/actions";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import type { MyProfileUser, BankAccount } from "@/features/myprofile/types";

const BANK_LIST = [
  "국민은행", "신한은행", "우리은행", "하나은행", "농협은행",
  "기업은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행",
  "씨티은행", "수협은행", "부산은행", "대구은행", "경남은행",
  "광주은행", "전북은행", "제주은행",
];

type Tab = "profile" | "notifications" | "bank";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "프로필 정보" },
  { id: "notifications", label: "알림 설정" },
  { id: "bank", label: "정산 계좌" },
];

const NOTIFICATION_ITEMS: { id: keyof NotificationPrefs; label: string; description: string }[] = [
  { id: "reservation", label: "예약 알림", description: "예약 확정, 변경, 취소 알림을 받습니다" },
  { id: "chat", label: "채팅 메시지", description: "새로운 메시지가 도착하면 알림을 받습니다" },
  { id: "marketing", label: "마케팅 알림", description: "이벤트 및 프로모션 소식을 받습니다" },
];

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
        checked ? "bg-orange-500 justify-end" : "bg-gray-200 justify-start"
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow" />
    </button>
  );
}

export default function SettingsClient({
  user,
  initialBankAccount,
}: {
  user: MyProfileUser;
  initialBankAccount: BankAccount | null;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "bank" || initialTab === "notifications" ? initialTab : "profile",
  );
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() =>
    loadNotificationPrefs(),
  );

  const [bankAccount, setBankAccount] = useState(initialBankAccount);
  const [isEditingBank, setIsEditingBank] = useState(!initialBankAccount);
  const [bankForm, setBankForm] = useState({
    bankName: initialBankAccount?.bankName ?? "",
    accountNumber: initialBankAccount?.accountNumber ?? "",
    accountHolder: initialBankAccount?.accountHolder ?? "",
  });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState("");

  const toggleNotification = (id: keyof NotificationPrefs) => {
    setNotificationPrefs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveNotificationPrefs(next);
      return next;
    });
  };

  const startEditBank = () => {
    setBankError("");
    setIsEditingBank(true);
  };

  const saveBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder) {
      setBankError("모든 항목을 입력해주세요.");
      return;
    }
    setBankSaving(true);
    setBankError("");
    const result = await upsertBankAccount(bankForm);
    setBankSaving(false);
    if (!result.ok) {
      setBankError(result.error);
      return;
    }
    setBankAccount(bankForm);
    setIsEditingBank(false);
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="md:hidden sticky top-16 z-50 bg-white border-b border-orange-100">
        <div className="h-14 px-5 flex items-center gap-3">
          <MobileBackButton />
          <span className="flex-1 font-semibold text-stone-900">프로필 설정</span>
        </div>
      </div>

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 md:pt-12 pb-10 md:pb-20">
        <div className="hidden md:flex items-center gap-4 mb-8">
          <DesktopBackButton />
          <div>
            <h2 className="text-2xl font-bold text-stone-900">프로필 설정</h2>
            <p className="text-sm text-gray-500 mt-1">계정 정보 및 설정을 관리하세요</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 lg:items-start">
          <aside className="bg-white rounded-2xl shadow-[0px_2px_12px_0px_rgba(232,116,42,0.10)] border border-orange-100 p-5 w-full lg:w-72 lg:shrink-0">
            <div className="flex flex-col items-center">
              <AvatarWithCamera
                initial={user.fullName?.[0] ?? ""}
                src={user.profileImage}
                onCameraClick={() => toast.error("사진 업로드는 아직 준비 중이에요.")}
                className="mb-4"
              />
              <p className="text-stone-900 text-xl font-bold">{user.fullName ?? ""}</p>
              <p className="mt-1 mb-3 text-gray-500 text-sm">{user.email ?? ""}</p>
              <span
                className={`px-3 py-1 rounded-md text-white text-xs font-medium ${
                  user.isVerified ? "bg-[var(--color-orange-500)]" : "bg-gray-400"
                }`}
              >
                {user.isVerified ? "본인인증 완료" : "본인인증 미완료"}
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full h-12 rounded-xl text-left px-4 text-base font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-[var(--color-orange-500)] text-white"
                      : "bg-orange-50 text-gray-500 hover:bg-orange-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="flex-1 flex flex-col gap-6">
            {activeTab === "profile" && (
              <SectionCard className="gap-0">
                <h2 className="text-stone-900 text-xl font-bold mb-6">기본 정보</h2>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-stone-900 text-sm font-medium">이름</p>
                    <input
                      value={user.fullName ?? ""}
                      disabled
                      className="w-full h-12 rounded-xl border border-orange-100 flex items-center px-4 text-gray-500 text-base bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-stone-900 text-sm font-medium">이메일</p>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                      <div className="w-full h-12 rounded-xl border border-orange-100 flex items-center pl-12 pr-4 text-gray-500 text-base">
                        {user.email ?? ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-stone-900 text-sm font-medium">휴대폰 번호</p>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                      <input
                        value={user.phoneNumber ?? ""}
                        disabled
                        className="w-full h-12 rounded-xl border border-orange-100 flex items-center pl-12 pr-4 text-gray-500 text-base bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-stone-900 text-sm font-medium">주소</p>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                      <input
                        value={user.address ?? ""}
                        disabled
                        placeholder="도로명 또는 지번 주소 검색"
                        className="w-full h-12 rounded-xl border border-orange-100 flex items-center pl-12 pr-4 text-gray-500 text-base bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                    {user.displayArea && (
                      <p className="text-xs text-gray-400 px-1">현재 등록된 위치: {user.displayArea}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-stone-900 text-sm font-medium">생년월일</p>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                      <input
                        type="date"
                        value={user.birthdate ?? ""}
                        disabled
                        className="w-full h-12 rounded-xl border border-orange-100 pl-12 pr-4 text-gray-500 text-base bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeTab === "notifications" && (
              <SectionCard className="gap-0">
                <h2 className="text-stone-900 text-xl font-bold mb-6">알림 설정</h2>
                <div className="flex flex-col gap-4">
                  {NOTIFICATION_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="w-full p-4 bg-orange-50 rounded-xl flex justify-between items-center gap-4"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-stone-900 text-base font-semibold">{item.label}</p>
                        <p className="text-gray-500 text-sm">{item.description}</p>
                      </div>
                      <Switch
                        checked={notificationPrefs[item.id]}
                        onChange={() => toggleNotification(item.id)}
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeTab === "bank" && (
              <SectionCard className="gap-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <Building2 size={20} className="text-[var(--color-orange-500)]" />
                    </div>
                    <div>
                      <h2 className="text-stone-900 text-xl font-bold">정산 계좌</h2>
                      <p className="text-xs text-gray-500 mt-0.5">수익 정산에 사용할 계좌를 등록해주세요</p>
                    </div>
                  </div>
                  {bankAccount && !isEditingBank && (
                    <button
                      onClick={startEditBank}
                      className="flex items-center gap-1.5 text-sm text-[var(--color-orange-500)] font-medium hover:opacity-80 transition-opacity"
                    >
                      <Pencil size={15} />
                      수정
                    </button>
                  )}
                </div>

                {isEditingBank ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-900 mb-1.5">은행 선택</label>
                      <select
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                        className="w-full h-11 px-3 rounded-xl border border-orange-100 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent"
                      >
                        <option value="">은행을 선택해주세요</option>
                        {BANK_LIST.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-900 mb-1.5">계좌번호</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="- 없이 숫자만 입력"
                        value={bankForm.accountNumber}
                        onChange={(e) =>
                          setBankForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))
                        }
                        className="w-full h-11 px-3 rounded-xl border border-orange-100 bg-white text-stone-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-900 mb-1.5">예금주</label>
                      <input
                        type="text"
                        placeholder="예금주명 입력"
                        value={bankForm.accountHolder}
                        onChange={(e) => setBankForm((f) => ({ ...f, accountHolder: e.target.value }))}
                        className="w-full h-11 px-3 rounded-xl border border-orange-100 bg-white text-stone-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent"
                      />
                    </div>
                    {bankError && <p className="text-sm text-red-500">{bankError}</p>}
                    <div className="flex gap-3 pt-1 justify-end">
                      {bankAccount && (
                        <button
                          onClick={() => {
                            setIsEditingBank(false);
                            setBankError("");
                          }}
                          className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-orange-100 text-sm font-medium text-gray-500 hover:bg-orange-50 transition-colors"
                        >
                          <X size={15} />
                          취소
                        </button>
                      )}
                      <button
                        onClick={saveBank}
                        disabled={bankSaving}
                        className="flex items-center gap-1.5 h-11 px-6 rounded-xl bg-[var(--color-orange-500)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Check size={15} />
                        {bankSaving ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : bankAccount ? (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">은행</p>
                      <p className="font-semibold text-stone-900">{bankAccount.bankName}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">계좌번호</p>
                      <p className="font-semibold text-stone-900">{bankAccount.accountNumber}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">예금주</p>
                      <p className="font-semibold text-stone-900">{bankAccount.accountHolder}</p>
                    </div>
                  </div>
                ) : null}
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
