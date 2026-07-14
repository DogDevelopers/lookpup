import { v2 as cloudinary } from "cloudinary";
import { clientEnv, getServerEnv } from "@/lib/env";

let configured = false;

export default function getCloudinaryClient() {
  if (!configured) {
    const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = getServerEnv();
    cloudinary.config({
      cloud_name: clientEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    configured = true;
  }
  return cloudinary;
}
