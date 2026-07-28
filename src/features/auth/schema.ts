import { z } from "zod";

export const providerSchema = z.enum(["kakao", "google"]);
export type Provider = z.infer<typeof providerSchema>;

export const portOneIdentityVerificationSchema = z.object({
  status: z.string(),
  verifiedCustomer: z
    .object({
      name: z.string(),
      birthDate: z.string().optional(),
      gender: z.string().optional(),
      phoneNumber: z.string().optional(),
    })
    .optional(),
});
