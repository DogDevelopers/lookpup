"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateOwnerLocation } from "@/features/myprofile/actions";
import LocationPickerWithMap, {
  type LocationValue,
} from "@/components/common/LocationPickerWithMap";

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  dong: string;
}

interface LocationEditModalProps {
  open: boolean;
  initialData: LocationData | null;
  onClose: () => void;
  onSave: (data: LocationData) => void;
}

function toLocationValue(data: LocationData | null): LocationValue | null {
  if (!data) return null;
  return { address: data.address, lat: data.lat, lng: data.lng, displayArea: data.dong };
}

export default function LocationEditModal({
  open,
  initialData,
  onClose,
  onSave,
}: LocationEditModalProps) {
  const [pendingLocation, setPendingLocation] = useState<LocationValue | null>(
    toLocationValue(initialData),
  );
  const [locationModalError, setLocationModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (open !== prevOpen || initialData !== prevInitialData) {
    setPrevOpen(open);
    setPrevInitialData(initialData);
    if (open) {
      setPendingLocation(toLocationValue(initialData));
      setLocationModalError(null);
    }
  }

  const handleConfirm = async () => {
    if (!pendingLocation) {
      setLocationModalError("주소 검색 후 목록에서 주소를 선택해주세요.");
      return;
    }

    setSaving(true);
    const result = await updateOwnerLocation({
      address: pendingLocation.address,
      lat: pendingLocation.lat,
      lng: pendingLocation.lng,
      dong: pendingLocation.displayArea,
    });
    setSaving(false);

    if (!result.ok) {
      setLocationModalError(result.error);
      return;
    }

    onSave({
      address: pendingLocation.address,
      lat: pendingLocation.lat,
      lng: pendingLocation.lng,
      dong: pendingLocation.displayArea,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-stone-900 text-lg font-semibold">위치 수정</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <LocationPickerWithMap
          value={pendingLocation}
          onChange={(v) => {
            setPendingLocation(v);
            setLocationModalError(null);
          }}
          className="mb-4"
        />

        {locationModalError && <p className="text-xs text-red-500 mb-3">{locationModalError}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!pendingLocation || saving}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? "저장 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
