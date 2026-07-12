"use client";

import { useState } from "react";

// TODO: 제출 시 Cloudinary(or 다른 스토리지) 업로드를 features/sitter-register/actions.ts에서 처리.
// 여기서는 로컬 선택/미리보기만 담당한다.
export function useSingleImageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return null;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    return selected;
  };

  return { file, preview, onSelect, setFile, setPreview };
}

export function useMultiFileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const onAdd = (e: React.ChangeEvent<HTMLInputElement>, withPreview = false) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return [];
    setFiles((prev) => [...prev, ...selected]);
    if (withPreview) {
      setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    }
    e.target.value = "";
    return selected;
  };

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return { files, previews, onAdd, removeAt, setFiles, setPreviews };
}
