"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CustomModal } from "@/components/common/CustomModal";
import SectionCard from "@/components/common/SectionCard";
import { updatePet, deletePet } from "@/features/pet-register/actions";
import type { PetUpdateInput } from "@/features/pet-register/schema";

export interface MyPet {
  id: string;
  name: string;
  animalType: string;
  breed: string | null;
  age: number | null;
  gender: "male" | "female";
  weight: number | null;
  neutered: boolean;
  caution: string | null;
}

const inputCls =
  "w-full h-11 px-3 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-gray-400">{label}</span>
      {children}
    </div>
  );
}

export default function MyPetsClient({ pets: initialPets }: { pets: MyPet[] }) {
  const [pets, setPets] = useState(initialPets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<PetUpdateInput | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = (pet: MyPet) => {
    setEditingId(pet.id);
    setForm({
      name: pet.name,
      breed: pet.breed ?? "",
      age: pet.age != null ? String(pet.age) : "",
      weight: pet.weight != null ? String(pet.weight) : "",
      gender: pet.gender,
      neutered: pet.neutered,
      caution: pet.caution ?? "",
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setForm(null);
  };

  const handleSave = () => {
    if (!editingId || !form) return;
    startTransition(async () => {
      const result = await updatePet(editingId, form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPets((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: form.name,
                breed: form.breed || null,
                age: form.age ? Number(form.age) : null,
                weight: form.weight ? Number(form.weight) : null,
                gender: form.gender,
                neutered: form.neutered,
                caution: form.caution || null,
              }
            : p,
        ),
      );
      closeEdit();
      toast.success("반려동물 정보가 수정되었습니다.");
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    startTransition(async () => {
      const result = await deletePet(deletingId);
      if (!result.ok) {
        toast.error(result.error);
        setDeletingId(null);
        return;
      }
      setPets((prev) => prev.filter((p) => p.id !== deletingId));
      setDeletingId(null);
      toast.success("반려동물이 삭제되었습니다.");
    });
  };

  if (pets.length === 0) {
    return (
      <div className="w-full max-w-[720px] mx-auto px-5 py-8">
        <h1 className="text-xl font-bold text-stone-900 mb-5">반려동물 관리</h1>
        <SectionCard className="items-center text-center py-12 gap-3">
          <p className="text-sm text-gray-500">등록된 반려동물이 없어요</p>
          <Link
            href="/pet-register"
            className="h-11 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center transition-colors"
          >
            반려동물 등록하기
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[720px] mx-auto px-5 py-8 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">반려동물 관리</h1>
        <Link
          href="/pet-register"
          className="h-9 px-4 rounded-xl border border-orange-500 text-orange-500 text-sm font-medium flex items-center hover:bg-orange-50 transition-colors"
        >
          추가하기
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pets.map((pet) => (
          <SectionCard key={pet.id} className="gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">
                  {pet.animalType === "dog" ? "🐕" : pet.animalType === "cat" ? "🐈" : "🐾"}
                </span>
                <div>
                  <p className="text-stone-900 font-semibold">{pet.name}</p>
                  <p className="text-xs text-gray-400">
                    {pet.breed || "품종 미상"} · {pet.gender === "male" ? "남아" : "여아"}
                    {pet.neutered && " · 중성화"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(pet)}
                  aria-label="수정"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(pet.id)}
                  aria-label="삭제"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {(pet.age != null || pet.weight != null) && (
              <div className="flex gap-4 text-xs text-gray-400">
                {pet.age != null && <span>나이 {pet.age}살</span>}
                {pet.weight != null && <span>체중 {pet.weight}kg</span>}
              </div>
            )}
            {pet.caution && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line">
                {pet.caution}
              </p>
            )}
          </SectionCard>
        ))}
      </div>

      <CustomModal
        open={deletingId !== null}
        type="danger"
        size="medium"
        title="반려동물을 삭제하시겠습니까?"
        description="삭제한 반려동물 정보는 복구할 수 없습니다."
        cancelText="취소"
        confirmText="삭제하기"
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />

      <CustomModal
        open={editingId !== null}
        type="confirm"
        size="medium"
        title="반려동물 정보 수정"
        cancelText="취소"
        confirmText={isPending ? "저장 중..." : "저장"}
        onClose={closeEdit}
        onConfirm={handleSave}
      >
        {form && (
          <div className="flex flex-col gap-3">
            <Field label="이름">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                className={inputCls}
              />
            </Field>
            <Field label="품종">
              <input
                value={form.breed}
                onChange={(e) => setForm((f) => (f ? { ...f, breed: e.target.value } : f))}
                className={inputCls}
              />
            </Field>
            <div className="flex gap-3">
              <Field label="나이" className="flex-1">
                <input
                  value={form.age}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, age: e.target.value.replace(/[^0-9]/g, "") } : f))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="체중(kg)" className="flex-1">
                <input
                  value={form.weight}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, weight: e.target.value.replace(/[^0-9.]/g, "") } : f,
                    )
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="성별">
              <div className="flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((f) => (f ? { ...f, gender: g } : f))}
                    className={`flex-1 h-11 rounded-xl border-2 text-sm font-medium transition-colors ${
                      form.gender === g
                        ? "bg-orange-50 border-orange-500 text-orange-500"
                        : "bg-white border-orange-100 text-stone-900"
                    }`}
                  >
                    {g === "male" ? "남아" : "여아"}
                  </button>
                ))}
              </div>
            </Field>
            <button
              type="button"
              onClick={() => setForm((f) => (f ? { ...f, neutered: !f.neutered } : f))}
              className={`h-11 px-4 rounded-xl border-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                form.neutered
                  ? "bg-orange-50 border-orange-500 text-orange-500"
                  : "bg-white border-orange-100 text-stone-900"
              }`}
            >
              중성화 수술 완료
            </button>
            <Field label="특이사항">
              <textarea
                value={form.caution}
                onChange={(e) => setForm((f) => (f ? { ...f, caution: e.target.value } : f))}
                maxLength={500}
                className="w-full h-20 px-3 py-2 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300 resize-none"
              />
            </Field>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
