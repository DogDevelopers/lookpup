import { getCloudinarySignature } from "@/lib/cloudinary-signature";

export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const { cloudName, apiKey, timestamp, signature } = await getCloudinarySignature(folder);

  const body = new FormData();
  bhttps://github.com/DogDevelopers/lookpup/pull/13/conflict?name=src%252Flib%252Fconstants.ts&ancestor_oid=c6fde33cadaffc2cfd490cdc4444d96d913b2842&base_oid=8db51bf4226be1f19f38046227ed9b5b7ccbaec7&head_oid=58e10d35425901759ba80bacdf6ae5e1ab2530ecody.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  body.append("folder", folder);

  const resourceType = file.type.startsWith("image/") ? "image" : "raw";

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "업로드 실패");

  return data.secure_url as string;
}
