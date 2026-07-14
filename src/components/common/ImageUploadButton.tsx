"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/upload-image";

interface ImageUploadButtonProps {
  onUploaded: (url: string) => void;
  multiple?: boolean;
  maxFiles?: number;
  children?: React.ReactNode;
}

export function ImageUploadButton({
  onUploaded,
  multiple = false,
  maxFiles = 1,
  children,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, maxFiles);
    e.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImage(formData);
      if (result.ok) onUploaded(result.url);
    }
    setUploading(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 disabled:opacity-50 transition-colors"
      >
        {children ?? (
          <>
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImagePlus size={16} />
            )}
            {uploading ? "업로드 중..." : "사진 추가"}
          </>
        )}
      </button>
    </>
  );
}
