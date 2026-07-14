import { v2 as cloudinary } from "cloudinary";
import { clientEnv, getServerEnv } from "./env";

const serverEnv = getServerEnv();

cloudinary.config({
  cloud_name: clientEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: serverEnv.CLOUDINARY_API_KEY,
  api_secret: serverEnv.CLOUDINARY_API_SECRET,
});

export default cloudinary;
