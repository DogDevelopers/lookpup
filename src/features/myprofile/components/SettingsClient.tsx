"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import Avatar from "@/components/ui/Avatar";
import SectionCard from "@/components/common/SectionCard";
import { upsertBankAccount, deleteBankAccount } from "@/features/myprofile/actions";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import type { MyProfileUser, BankAccount } from "@/features/myprofile/types";

type Tab = "profile" | "notifications" | "bank";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "프로필" },
  { id: "notifications", label: "알림" },
  { id: "bank", label: "계좌" },
];

export default function SettingsClient({
  user,
  initialBankAccount,
}: {
  user: MyProfileUser;
  initialBankAccount: BankAccount | null;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="w-full max-w-[720px] mx-auto px-5 py-8 flex flex-col gap-5">
      <h1 className="text-xl font-bold text-stone-900">설정</h1>

      <div className="flex gap-1 border-b border-orange-100">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-500 hover:text-stone-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab user={user} />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "bank" && <BankTab initialBankAccount={initialBankAccount} />}
    </div>
  );
}

function ProfileTab({ user }: { user: MyProfileUser }) {
  const fields = [
    { label: "이름", value: user.fullName },
    { label: "이메일", value: user.email },
    { label: "전화번호", value: user.phoneNumber },
    { label: "주소", value: user.address || user.displayArea },
    { label: "생년월일", value: user.birthdate },
  ];

  return (
    <SectionCard className="items-center">
      <Avatar initial={user.fullName?.charAt(0) ?? "?"} src={user.profileImage} size="2xl" />
      <div className="w-full flex flex-col gap-3 mt-2">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">{label}</span>
            <div className="h-11 px-3 flex items-center rounded-xl bg-gray-50 border border-gray-100 text-sm text-stone-700">
              {value || "-"}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">
        본인인증된 정보는 직접 수정할 수 없습니다.
      </p>
    </SectionCard>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs());

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(next);
      return next;
    });
  };

  const items: { key: keyof NotificationPrefs; label: string; description: string }[] = [
    { key: "reservation", label: "예약 알림", description: "예약 요청, 수락, 취소 등" },
    { key: "chat", label: "채팅 알림", description: "새 메시지 알림" },
    { key: "marketing", label: "마케팅 알림", description: "이벤트 및 프로모션 소식" },
  ];

  return (
    <SectionCard>
      {items.map(({ key, label, description }) => (
        <div key={key} className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-stone-900">{label}</p>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            onClick={() => toggle(key)}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
              prefs[key] ? "bg-orange-500 justify-end" : "bg-gray-200 justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>
      ))}
    </SectionCard>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      {children}
    </div>
  );
}

function BankTab({ initialBankAccount }: { initialBankAccount: BankAccount | null }) {
  const [account, setAccount] = useState(initialBankAccount);
  const [editing, setEditing] = useState(!initialBankAccount);
  const [form, setForm] = useState({
    bankName: initialBankAccount?.bankName ?? "",
    accountNumber: initialBankAccount?.accountNumber ?? "",
    accountHolder: initialBankAccount?.accountHolder ?? "",
  });
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertBankAccount(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAccount(form);
      setEditing(false);
      toast.success("계좌 정보가 저장되었습니다.");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteBankAccount();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAccount(null);
      setForm({ bankName: "", accountNumber: "", accountHolder: "" });
      setEditing(true);
      toast.success("계좌 정보가 삭제되었습니다.");
    });
  };

  if (!editing && account) {
    return (
      <SectionCard>
        <Field label="은행">
          <p className="text-sm text-stone-900">{account.bankName}</p>
        </Field>
        <Field label="계좌번호">
          <p className="text-sm text-stone-900">{account.accountNumber}</p>
        </Field>
        <Field label="예금주">
          <p className="text-sm text-stone-900">{account.accountHolder}</p>
        </Field>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 h-11 rounded-xl border border-orange-100 text-sm font-medium text-stone-900 hover:bg-orange-50 transition-colors"
          >
            수정
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            삭제
          </button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <Field label="은행">
        <input
          value={form.bankName}
          onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          placeholder="예: 국민은행"
          className="h-11 px-3 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300"
        />
      </Field>
      <Field label="계좌번호">
        <input
          value={form.accountNumber}
          onChange={(e) =>
            setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/[^0-9]/g, "") }))
          }
          placeholder="'-' 없이 숫자만 입력"
          className="h-11 px-3 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300"
        />
      </Field>
      <Field label="예금주">
        <input
          value={form.accountHolder}
          onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
          className="h-11 px-3 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300"
        />
      </Field>
      <div className="flex gap-2 mt-2">
        {account && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 h-11 rounded-xl border border-orange-100 text-sm font-medium text-gray-500 hover:bg-orange-50 transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </SectionCard>
  );
}
