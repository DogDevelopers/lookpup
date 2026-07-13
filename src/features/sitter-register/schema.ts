import { z } from "zod";

export const locationSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  displayArea: z.string(),
});

export const step1Schema = z.object({
  profilePhotoFile: z.instanceof(File).nullable(),
  location: locationSchema.nullable(),
  introduction: z
    .string()
    .min(20, "자기소개는 20자 이상 입력해주세요.")
    .max(500, "자기소개는 500자 이하로 입력해주세요."),
  career: z.string().min(1, "펫시터 경력을 선택해주세요."),
});

export const step2Schema = z.object({
  selectedServices: z
    .array(z.enum(["visit", "foster", "walk", "pickup"]))
    .min(1, "제공 가능한 서비스를 1개 이상 선택해주세요."),
});

export const step3Schema = z.object({
  selectedAnimals: z
    .array(z.enum(["small_dog", "medium_dog", "large_dog", "cat"]))
    .min(1, "돌봄 가능 동물을 1개 이상 선택해주세요."),
  certificateFiles: z.array(z.instanceof(File)),
  activityPhotoFiles: z.array(z.instanceof(File)),
});

export const sitterRegisterSchema = step1Schema
  .extend(step2Schema.shape)
  .extend(step3Schema.shape)
  .superRefine((data, ctx) => {
    if (data.location === null) {
      ctx.addIssue({
        code: "custom",
        message: "활동 지역을 검색해주세요.",
        path: ["location"],
      });
    }
  });

export const STEP_FIELDS: Record<1 | 2 | 3, string[]> = {
  1: ["profilePhotoFile", "location", "introduction", "career"],
  2: ["selectedServices"],
  3: ["selectedAnimals", "certificateFiles", "activityPhotoFiles"],
};

export const createSitterSchema = z.object({
  introduction: z.string().min(20).max(500),
  career: z.string().min(1),
  location: locationSchema,
  selectedServices: z.array(z.enum(["visit", "foster", "walk", "pickup"])).min(1),
  selectedAnimals: z.array(z.enum(["small_dog", "medium_dog", "large_dog", "cat"])).min(1),
});
export type CreateSitterInput = z.infer<typeof createSitterSchema>;

const serviceInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  price: z.number().min(1000, "서비스 가격은 1,000원 이상이어야 합니다."),
  description: z.string().max(300).optional().default(""),
});

export const updateSitterProfileSchema = z.object({
  introduction: z.string().min(20).max(500),
  career: z.string().min(1),
  availableArea: z.string().min(1),
  displayArea: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  availableAnimals: z.array(z.enum(["small_dog", "medium_dog", "large_dog", "cat"])).min(1),
  activityPhotoUrls: z.array(z.string()),
  services: z.array(serviceInputSchema),
  deletedServiceIds: z.array(z.string()),
});
export type UpdateSitterProfileInput = z.infer<typeof updateSitterProfileSchema>;
