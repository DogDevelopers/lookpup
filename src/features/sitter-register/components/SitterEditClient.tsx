"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Eye, Camera, MapPin, Check, Building2, Pencil } from "lucide-react";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import SectionCard from "@/components/common/SectionCard";
import { CustomModal } from "@/components/common/CustomModal";
import Avatar from "@/components/ui/Avatar";
import StatGrid from "@/components/ui/StatGrid";
import SitterProfileCard from "@/components/common/SitterProfileCard";
import LocationPickerWithMap, { type LocationValue } from "@/components/common/LocationPickerWithMap";
import { SERVICES, ANIMALS, type SitterAnimalId } from "@/lib/sitter-options";
import { CAREER_OPTIONS } from "@/features/sitter-register/constants";
import { updateSitterProfile, type SitterServiceRow } from "@/features/sitter-register/actions";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { SitterDetail } from "@/features/petsitters/types";
import BankAccountModal from "@/components/common/BankAccountModal";
import type { BankAccount } from "@/lib/bank-account/schema";

const SERVICE_OPTIONS = SERVICES.map((s) => s.title);

const SERVICE_DEFAULT_UNIT: Record<string, string> = {
  방문돌봄: "1일",
  위탁돌봄: "1일",
  산책: "1시간",
  픽업: "1회",
};

interface ServiceItem {
  dbId?: string;
  name: string;
  unit: string;
  price: string;
  desc: string;
  enabled: boolean;
}

function buildServiceList(existing: SitterServiceRow[]): ServiceItem[] {
  return SERVICE_OPTIONS.map((name) => {
    const match = existing.find((s) => s.title === name);
    return {
      dbId: match?.id,
      name,
      unit: SERVICE_DEFAULT_UNIT[name] ?? "1회",
      price: match ? String(match.price) : "10000",
      desc: match?.description ?? "",
      enabled: !!match,
    };
  });
}

const TABS = ["소개", "서비스", "위치"] as const;
type Tab = (typeof TABS)[number];

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        selected ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500"
      }`}
    >
      {selected && <Check size={10} strokeWidth={2.5} />}
      {label}
    </button>
  );
}

function ServiceRow({ item, onChange }: { item: ServiceItem; onChange: (updated: ServiceItem) => void }) {
  return (
    <div className="bg-orange-50 rounded-xl p-4 space-y-2">
      <input
        value={item.name}
        disabled
        className="w-full h-9 px-3 bg-white border border-orange-100 rounded-[10px] text-sm text-stone-900 outline-none opacity-70 cursor-not-allowed"
      />
      <div className="flex items-center gap-2">
        <input
          value={item.unit}
          onChange={(e) => onChange({ ...item, unit: e.target.value })}
          placeholder="단위"
          className="hidden lg:block w-20 h-9 px-2 bg-white border border-orange-100 rounded-[10px] text-sm text-center text-stone-900 outline-none focus:border-orange-300"
        />
        <div className="relative">
          <input
            value={item.price}
            onChange={(e) => onChange({ ...item, price: e.target.value.replace(/\D/g, "") })}
            placeholder="가격"
            className="w-28 h-9 pl-3 pr-7 bg-white border border-orange-100 rounded-[10px] text-sm text-right text-orange-500 font-bold outline-none focus:border-orange-300"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">원</span>
        </div>
      </div>
      <input
        value={item.desc}
        onChange={(e) => onChange({ ...item, desc: e.target.value })}
        placeholder="서비스 설명"
        className="w-full h-9 px-3 bg-white border border-orange-100 rounded-[10px] text-sm text-gray-500 outline-none focus:border-orange-300"
      />
    </div>
  );
}

export default function SitterEditClient({
  sitter,
  initialServices,
  initialBankAccount,
}: {
  sitter: SitterDetail;
  initialServices: SitterServiceRow[];
  initialBankAccount: BankAccount | null;
}) {
  const router = useRouter();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("소개");
  const [isPending, startTransition] = useTransition();

  const [bankAccount, setBankAccount] = useState(initialBankAccount);
  const [showBankModal, setShowBankModal] = useState(false);

  const [bio, setBio] = useState(sitter.introduction ?? "");
  const [career, setCareer] = useState(sitter.career ?? CAREER_OPTIONS[0].value);
  const [animals, setAnimals] = useState<SitterAnimalId[]>(sitter.available_animals as SitterAnimalId[]);
  const [photos, setPhotos] = useState<(string | null)[]>(() => {
    const slots: (string | null)[] = [null, null, null, null, null, null];
    sitter.activity_photo_urls.forEach((url, i) => {
      if (i < 6) slots[i] = url;
    });
    return slots;
  });
  const [serviceList, setServiceList] = useState<ServiceItem[]>(() => buildServiceList(initialServices));
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(sitter.profile_image);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState<number | null>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const photoSlotIndex = useRef(-1);
  const [location, setLocation] = useState<LocationValue | null>(
    sitter.available_area && sitter.latitude != null && sitter.longitude != null
      ? {
          address: sitter.available_area,
          lat: sitter.latitude,
          lng: sitter.longitude,
          displayArea: sitter.display_area ?? sitter.available_area,
        }
      : null,
  );

  const enabledServiceNames = serviceList.filter((s) => s.enabled).map((s) => s.name);

  const toggleServiceEnabled = (name: string) =>
    setServiceList((list) => list.map((s) => (s.name === name ? { ...s, enabled: !s.enabled } : s)));

  const toggleAnimal = (id: SitterAnimalId) =>
    setAnimals((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const updateServiceItem = (updated: ServiceItem) =>
    setServiceList((list) => list.map((s) => (s.name === updated.name ? updated : s)));

  const removePhoto = (idx: number) =>
    setPhotos((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });

  const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingProfile(true);
    try {
      const url = await uploadToCloudinary(file, "sitters/avatars");
      setProfilePhotoUrl(url);
    } catch {
      toast.error("사진 업로드에 실패했어요.");
    } finally {
      setUploadingProfile(false);
    }
  };

  const openPhotoSlot = (idx: number) => {
    photoSlotIndex.current = idx;
    photoFileRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = photoSlotIndex.current;
    e.target.value = "";
    if (!file || idx < 0) return;

    setUploadingPhotoIdx(idx);
    try {
      const url = await uploadToCloudinary(file, "sitters/activity-photos");
      setPhotos((prev) => {
        const next = [...prev];
        next[idx] = url;
        return next;
      });
    } catch {
      toast.error("사진 업로드에 실패했어요.");
    } finally {
      setUploadingPhotoIdx(null);
    }
  };

  const handleSave = () => {
    if (!location) {
      toast.error("활동 지역을 입력해주세요.");
      return;
    }
    if (animals.length === 0) {
      toast.error("돌봄 가능 동물을 1개 이상 선택해주세요.");
      return;
    }

    startTransition(async () => {
      const result = await updateSitterProfile({
        introduction: bio,
        career,
        availableArea: location.address,
        displayArea: location.displayArea,
        latitude: location.lat,
        longitude: location.lng,
        availableAnimals: animals,
        profilePhotoUrl,
        activityPhotoUrls: photos.filter((p): p is string => !!p),
        services: serviceList
          .filter((s) => s.enabled)
          .map((s) => ({ id: s.dbId, title: s.name, price: Number(s.price) || 0, description: s.desc })),
        deletedServiceIds: serviceList.filter((s) => !s.enabled && s.dbId).map((s) => s.dbId!),
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        setShowErrorModal(true);
        return;
      }

      setShowSaveModal(true);
    });
  };

  const careerLabel = CAREER_OPTIONS.find((o) => o.value === career)?.label ?? career;
  const stats = [
    { label: "경력", value: careerLabel },
    { label: "완료", value: sitter.review_count > 0 ? `${sitter.review_count}+` : "-" },
  ];

  const renderTabContent = () => (
    <>
      {activeTab === "소개" && (
        <div className="flex flex-col gap-4">
          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-4">소개</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={7}
              placeholder="보호자에게 보여질 자기소개를 작성해 주세요."
              className="w-full px-4 py-3 bg-white border border-orange-100 rounded-[10px] text-[15px] text-stone-900 placeholder:text-gray-400 outline-none focus:border-orange-300 resize-none leading-6"
            />
            <span className="block text-xs text-gray-400 mt-1">{bio.length}자</span>
          </SectionCard>

          <SectionCard className="p-6 gap-0 md:hidden">
            <h3 className="font-bold text-stone-900 mb-4">경력</h3>
            <select
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              className="w-full h-11 px-3 bg-orange-50 border border-orange-100 rounded-[10px] text-sm font-medium text-orange-500 outline-none focus:border-orange-300"
            >
              {CAREER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </SectionCard>

          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-4">돌봄 가능</h3>
            <div className="flex flex-wrap gap-2">
              {ANIMALS.map(({ id, label }) => (
                <ToggleChip key={id} label={label} selected={animals.includes(id)} onToggle={() => toggleAnimal(id)} />
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">돌볼 수 있는 반려동물 유형을 모두 선택해 주세요.</p>
          </SectionCard>

          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-1">사진</h3>
            <p className="text-xs text-gray-400 mb-4">최대 6장까지 등록할 수 있습니다.</p>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`사진 ${idx + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 size-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPhotoSlot(idx)}
                      disabled={uploadingPhotoIdx === idx}
                      className="aspect-square w-full rounded-xl border border-dashed border-orange-100 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 transition-colors disabled:opacity-60"
                    >
                      <Plus size={20} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        {uploadingPhotoIdx === idx ? "업로드 중..." : "사진 추가"}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "서비스" && (
        <div className="flex flex-col gap-4">
          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-4">제공 서비스</h3>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((s) => (
                <ToggleChip key={s} label={s} selected={enabledServiceNames.includes(s)} onToggle={() => toggleServiceEnabled(s)} />
              ))}
            </div>
          </SectionCard>
          {serviceList.some((item) => item.enabled) && (
            <SectionCard className="p-6 gap-0">
              <h3 className="font-bold text-stone-900 mb-4">서비스 및 가격</h3>
              <div className="space-y-3">
                {serviceList
                  .filter((item) => item.enabled)
                  .map((item) => (
                    <ServiceRow key={item.name} item={item} onChange={updateServiceItem} />
                  ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === "위치" && (
        <SectionCard className="p-6 gap-0">
          <h3 className="font-bold text-stone-900 mb-4">활동 지역</h3>
          <LocationPickerWithMap value={location} onChange={setLocation} />
        </SectionCard>
      )}
    </>
  );

  return (
    <>
      <input ref={profileFileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileFileChange} />
      <input ref={photoFileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />

      <div className="md:hidden flex flex-col bg-orange-50">
        <div className="px-5 pt-4">
          <MobileBackButton />
        </div>

        <div className="px-5 pt-3 pb-5">
          <SitterProfileCard
            profile={{
              name: sitter.full_name ?? "-",
              initial: sitter.full_name?.[0] ?? "?",
              src: profilePhotoUrl,
              verified: sitter.is_verified,
              location: location?.displayArea ?? "위치 탭에서 설정하세요",
              rating: sitter.rating,
              reviewCount: sitter.review_count,
              services: enabledServiceNames,
              career: careerLabel,
            }}
            action={
              <button
                type="button"
                onClick={() => profileFileRef.current?.click()}
                disabled={uploadingProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-xs text-stone-900 shrink-0 self-start hover:bg-orange-100 transition-colors disabled:opacity-60"
              >
                <Camera size={12} className="text-orange-500" />
                {uploadingProfile ? "업로드 중..." : "사진 변경"}
              </button>
            }
          />
          <p className="mt-2 text-xs text-gray-400">* 보호자 프로필 사진과 동일한 사진으로 적용됩니다.</p>
        </div>

        <div className="px-5 pb-5">
          <SectionCard className="p-4 gap-0 flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">정산 계좌</p>
                <p className="text-xs text-gray-500">
                  {bankAccount ? `${bankAccount.bankName} ${bankAccount.accountNumber.slice(-4)}` : "등록된 계좌가 없습니다"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBankModal(true)}
              className="flex items-center gap-1 text-xs font-medium text-orange-500 shrink-0"
            >
              {bankAccount ? <Pencil size={13} /> : <Plus size={13} />}
              {bankAccount ? "수정" : "등록"}
            </button>
          </SectionCard>
        </div>

        <div className="bg-orange-50 border-b border-orange-100 px-5 sticky top-0 z-10">
          <div className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === tab ? "text-orange-500" : "text-gray-400"}`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-5 py-5 pb-28">{renderTabContent()}</div>
      </div>

      <main className="hidden md:block bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-10 py-12">
          <div className="flex items-center gap-3 mb-8">
            <DesktopBackButton />
            <div>
              <h1 className="text-xl font-bold text-stone-900">펫시터 프로필 수정</h1>
              <p className="text-sm text-gray-400">등록한 프로필 정보를 수정할 수 있습니다.</p>
            </div>
          </div>

          <div className="flex gap-8 items-start">
            <SectionCard className="w-85.25 shrink-0 items-center gap-0">
              <div className="relative w-full aspect-square rounded-xl bg-linear-to-br from-gray-100 to-gray-200 mb-4 overflow-hidden flex items-center justify-center">
                <Avatar initial={sitter.full_name?.[0] ?? "?"} size="2xl" variant="dark" src={profilePhotoUrl} />
                <button
                  type="button"
                  onClick={() => profileFileRef.current?.click()}
                  disabled={uploadingProfile}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-100 rounded-full shadow-sm text-xs text-stone-900 hover:bg-orange-50 transition-colors disabled:opacity-60"
                >
                  <Camera size={12} className="text-orange-500" />
                  {uploadingProfile ? "업로드 중..." : "사진 변경"}
                </button>
              </div>
              <p className="mb-4 text-xs text-gray-400 text-center">* 보호자 프로필 사진과 동일한 사진으로 적용됩니다.</p>

              <input
                value={sitter.full_name ?? ""}
                disabled
                placeholder="이름"
                className="text-2xl font-bold text-stone-900 text-center border-b-2 border-orange-100 outline-none bg-transparent w-full mb-2 pb-1 opacity-60 cursor-not-allowed"
              />

              <button
                type="button"
                onClick={() => setActiveTab("위치")}
                className="flex items-center gap-1 text-gray-500 mb-4 w-full justify-center hover:text-orange-500 transition-colors"
              >
                <MapPin size={14} className="shrink-0 text-orange-400" />
                <span className="text-sm truncate">{location?.displayArea ?? "위치 탭에서 설정"}</span>
              </button>

              <StatGrid stats={stats} className="w-full mb-4" />

              <div className="w-full bg-orange-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">경력 수정</p>
                <select
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-orange-100 rounded-[10px] text-sm font-bold text-orange-500 outline-none focus:border-orange-300"
                >
                  {CAREER_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full bg-orange-50 rounded-xl p-4 mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-1">정산 계좌</p>
                  <p className="text-sm font-bold text-stone-900 truncate">
                    {bankAccount ? `${bankAccount.bankName} ${bankAccount.accountNumber.slice(-4)}` : "등록된 계좌가 없습니다"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center gap-1 text-xs font-medium text-orange-500 shrink-0 hover:opacity-80 transition-opacity"
                >
                  {bankAccount ? <Pencil size={13} /> : <Plus size={13} />}
                  {bankAccount ? "수정" : "등록"}
                </button>
              </div>
            </SectionCard>

            <div className="flex-1 min-w-0">
              <div className="border-b border-orange-100 flex gap-8 mb-6">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-lg font-semibold relative transition-colors ${
                      activeTab === tab ? "text-orange-500" : "text-gray-500 hover:text-stone-900"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
                  </button>
                ))}
              </div>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 z-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 md:flex-none md:w-36 h-12 border border-orange-500 rounded-[10px] text-base font-semibold text-orange-500 hover:bg-orange-50 transition-colors"
          >
            취소
          </button>
          <Link
            href="/myprofile/sitter-profile"
            className="flex-1 md:flex-none md:w-40 h-12 border border-orange-500 rounded-[10px] text-base font-semibold text-orange-500 flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
          >
            <Eye size={16} />
            미리보기
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 md:flex-none md:w-44 h-12 bg-orange-500 rounded-[10px] text-base font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "저장 중..." : "수정 완료"}
          </button>
        </div>
      </div>

      <CustomModal
        open={showSaveModal}
        type="success"
        title="저장이 완료되었습니다"
        confirmText="프로필 보기"
        closeOnOverlay={false}
        closeOnEsc={false}
        showCloseButton={false}
        onConfirm={() => router.replace("/myprofile/sitter-profile")}
        onClose={() => router.replace("/myprofile/sitter-profile")}
      />

      <CustomModal
        open={showErrorModal}
        type="error"
        title="저장에 실패했습니다"
        description={errorMessage}
        confirmText="확인"
        onConfirm={() => setShowErrorModal(false)}
        onClose={() => setShowErrorModal(false)}
      />

      <BankAccountModal
        open={showBankModal}
        initialBankAccount={bankAccount}
        onClose={() => setShowBankModal(false)}
        onSaved={setBankAccount}
      />
    </>
  );
}
