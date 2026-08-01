import { getCloudinarySignature } from "@/lib/cloudinary-signature";

export function getCloudinaryThumbnail(url: string, size: number): string {
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const transform = `w_${size},h_${size},c_fill,g_face,f_auto,q_auto`;
  return `${url.slice(0, i + marker.length)}${transform}/${url.slice(i + marker.length)}`;
}

export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const { cloudName, apiKey, timestamp, signature } = await getCloudinarySignature(folder);

  const body = new FormData();
  body.append("file", file);
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
