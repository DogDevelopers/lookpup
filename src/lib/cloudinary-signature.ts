"use server";

import crypto from "crypto";
import { clientEnv, getServerEnv } from "@/lib/env";

export async function getCloudinarySignature(folder: string) {
  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = getServerEnv();
  const timestamp = Math.floor(Date.now() / 1000);
  const str = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash("sha256").update(str).digest("hex");

  return {
    cloudName: clientEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
  };
}
