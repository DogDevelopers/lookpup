"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, Clock, ImagePlus } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";

import {
  CARE_RECORD_TYPES,
  SERVICE_TYPE_LABEL,
  SERVICE_TYPE_RECS,
  type CareRecordType,
  type FieldConfig,
  type RecordTypeConfig,
  type ServiceType,
} from "@/features/care-records/record-types";

function CareRecordTypeCard({
  config,
  onClick,
}: {
  config: RecordTypeConfig;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2.5 bg-orange-50 rounded-2xl border border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-colors"
    >
      <span className="text-xl leading-none">{config.emoji}</span>
      <span className="text-[11px] text-stone-900 font-medium text-center leading-tight">
        {config.label}
      </span>
    </button>
  );
}

function CareRecordField({
  field,
  value,
  onChange,
  onFileChange,
  error,
}: {
  field: FieldConfig;
  value: string;
  onChange: (v: string) => void;
  onFileChange?: (file: File) => void;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const inputBase =
    "w-full h-10 px-3 bg-white border border-orange-100 rounded-xl text-sm text-stone-900 placeholder:text-gray-400 outline-none focus:border-orange-300 transition-colors";

  return (
    <div>
      <label className="block text-sm font-medium text-stone-900 mb-1.5">
        {field.label}
        {field.optional && (
          <span className="ml-1 text-xs text-gray-400 font-normal">(선택)</span>
        )}
      </label>

      {field.type === "time" && (
        <div className="flex gap-2">
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputBase} flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const h = String(now.getHours()).padStart(2, "0");
              const m = String(now.getMinutes()).padStart(2, "0");
              onChange(`${h}:${m}`);
            }}
            className="h-10 px-3 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-500 hover:bg-orange-100 transition-colors flex items-center gap-1 shrink-0"
          >
            <Clock size={12} />
            현재
          </button>
        </div>
      )}

      {field.type === "text" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputBase}
        />
      )}

      {field.type === "number" && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          min={0}
          className={inputBase}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "입력하세요"}
          rows={3}
          className="w-full px-3 py-2.5 bg-white border border-orange-100 rounded-xl text-sm text-stone-900 placeholder:text-gray-400 outline-none focus:border-orange-300 transition-colors resize-none"
        />
      )}

      {field.type === "select" && field.options && (
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                value === opt
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-orange-50 text-gray-600 border-orange-100 hover:border-orange-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {field.type === "photo" && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full bg-orange-50 border-2 border-dashed border-orange-200 rounded-xl overflow-hidden hover:bg-orange-100 transition-colors"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="미리보기"
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="h-24 flex flex-col items-center justify-center gap-1.5">
                <ImagePlus size={20} className="text-orange-400" />
                <span className="text-xs text-gray-400">사진을 추가하세요</span>
              </div>
            )}
          </button>
          {previewUrl && (
            <p className="mt-1.5 text-xs text-gray-400 truncate">{value}</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(URL.createObjectURL(file));
                onChange(file.name);
                onFileChange?.(file);
              }
            }}
          />
        </>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

function CareRecordTypeSelect({
  serviceType,
  onSelect,
  onClose,
}: {
  serviceType?: ServiceType;
  onSelect: (type: CareRecordType) => void;
  onClose: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const recTypes = serviceType ? SERVICE_TYPE_RECS[serviceType] : null;
  const displayList =
    recTypes && !showAll
      ? CARE_RECORD_TYPES.filter((t) => recTypes.includes(t.type))
      : CARE_RECORD_TYPES;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
        <h2 className="text-base font-bold text-stone-900">기록 유형 선택</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-orange-50 transition-colors"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="p-5 space-y-3">
        {serviceType && !showAll && (
          <p className="text-xs text-gray-400">
            {SERVICE_TYPE_LABEL[serviceType]} 서비스 추천 기록 유형
          </p>
        )}

        <div className="grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
          {displayList.map((config) => (
            <CareRecordTypeCard
              key={config.type}
              config={config}
              onClick={() => onSelect(config.type)}
            />
          ))}
        </div>

        {serviceType && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full py-2 text-xs text-orange-500 hover:text-orange-600 transition-colors font-medium"
          >
            {showAll ? "추천만 보기 ↑" : "전체 유형 보기 ↓"}
          </button>
        )}
      </div>
    </>
  );
}

function CareRecordForm({
  config,
  onSubmit,
  onBack,
  isUploading = false,
}: {
  config: RecordTypeConfig;
  onSubmit: (fields: Record<string, string>, photoFiles: Record<string, File>) => void;
  onBack: () => void;
  isUploading?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, ""]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({});

  const handleChange = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    config.fields.forEach((f) => {
      if (!f.optional && !values[f.key]?.trim()) {
        newErrors[f.key] = `${f.label}을(를) 입력해주세요.`;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(values, photoFiles);
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-orange-50 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h2 className="text-base font-bold text-stone-900">
            {config.emoji} {config.label}
          </h2>
        </div>
        <span className="px-2.5 py-1 bg-orange-50 rounded-full text-xs text-orange-500 font-medium">
          {config.statusText}
        </span>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto max-h-[55vh]">
        {config.fields.map((field) => (
          <CareRecordField
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            onChange={(v) => handleChange(field.key, v)}
            onFileChange={(file) => setPhotoFiles((prev) => ({ ...prev, [field.key]: file }))}
            error={errors[field.key]}
          />
        ))}
      </div>

      <div className="px-5 py-4 border-t border-orange-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isUploading}
          className="w-full h-12 bg-orange-500 rounded-2xl text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? "업로드 중..." : "저장하기"}
        </button>
      </div>
    </>
  );
}

export interface CareRecordModalPayload {
  reservationId?: string;
  roomId?: string;
  senderId?: string;
  type: CareRecordType;
  serviceType?: ServiceType;
  title: string;
  statusText: string;
  content: string;
  fields: Record<string, string>;
  imageUrls: string[];
  createdAt: string;
}

interface CareRecordModalProps {
  open: boolean;
  onClose: () => void;
  serviceType?: ServiceType;
  reservationId?: string;
  roomId?: string;
  senderId?: string;
  onSubmit: (record: CareRecordModalPayload) => void;
}

export default function CareRecordModal({
  open,
  onClose,
  serviceType,
  reservationId,
  roomId,
  senderId,
  onSubmit,
}: CareRecordModalProps) {
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedType, setSelectedType] = useState<CareRecordType | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setStep("select");
      setSelectedType(null);
    }
  }

  if (!open) return null;

  const selectedConfig = selectedType
    ? CARE_RECORD_TYPES.find((t) => t.type === selectedType)
    : null;

  const handleTypeSelect = (type: CareRecordType) => {
    setSelectedType(type);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedType(null);
  };

  const handleClose = () => {
    setStep("select");
    setSelectedType(null);
    onClose();
  };

  const handleSubmit = async (fields: Record<string, string>, photoFiles: Record<string, File>) => {
    if (!selectedConfig) return;
    setIsUploading(true);
    try {
      const imageUrls = await Promise.all(
        Object.values(photoFiles).map((file) => uploadToCloudinary(file, "care-records"))
      );
      const record: CareRecordModalPayload = {
        reservationId,
        roomId,
        senderId,
        type: selectedConfig.type,
        serviceType,
        title: selectedConfig.label,
        statusText: selectedConfig.statusText,
        content: fields.memo ?? "",
        fields,
        imageUrls,
        createdAt: new Date().toISOString(),
      };
      onSubmit(record);
      handleClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="w-96 max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "select" ? (
          <CareRecordTypeSelect
            serviceType={serviceType}
            onSelect={handleTypeSelect}
            onClose={handleClose}
          />
        ) : selectedConfig ? (
          <CareRecordForm
            config={selectedConfig}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isUploading={isUploading}
          />
        ) : null}
      </div>
    </div>
  );
}
