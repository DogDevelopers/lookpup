import { z } from "zod";

export const ownerLocationSchema = z.object({
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  dong: z.string().min(1),
});
export type OwnerLocationInput = z.infer<typeof ownerLocationSchema>;
