import type { z } from "zod";
import type { sitterRegisterSchema } from "./schema";

export type { SitterServiceId, SitterAnimalId } from "@/lib/sitter-options";
export type SitterRegisterFormValues = z.infer<typeof sitterRegisterSchema>;
