import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_KAKAO_MAP_KEY: z.string().min(1),
  NEXT_PUBLIC_PORTONE_STORE_ID: z.string().min(1),
  NEXT_PUBLIC_PORTONE_PAY_CHANNEL_KEY: z.string().min(1),
  NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PORTONE_API_SECRET: z.string().min(1),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_KAKAO_MAP_KEY: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY,
  NEXT_PUBLIC_PORTONE_STORE_ID: process.env.NEXT_PUBLIC_PORTONE_STORE_ID,
  NEXT_PUBLIC_PORTONE_PAY_CHANNEL_KEY: process.env.NEXT_PUBLIC_PORTONE_PAY_CHANNEL_KEY,
  NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY:
    process.env.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY,
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PORTONE_API_SECRET: process.env.PORTONE_API_SECRET,
  });
}
