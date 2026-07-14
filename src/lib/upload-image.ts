"use server";

import getCloudinaryClient from "@/lib/cloudinary-server";
import { createClient } from "@/lib/supabase/server";

type UploadResult = { ok: true; url: string } | { ok: false; error: string };

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadImage(formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "파일이 없습니다." };
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "이미지 파일만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "파일 크기는 10MB 이하여야 합니다." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const cloudinary = getCloudinaryClient();

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "lookpup" },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve(result);
        },
      );
      stream.end(buffer);
    });
    return { ok: true, url: result.secure_url };
  } catch {
    return { ok: false, error: "업로드에 실패했습니다." };
  }
}
