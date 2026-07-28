"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { petRegisterSchema } from "../schema";
import type { PetRegisterFormValues } from "../types";

export function usePetRegisterForm() {
  return useForm<PetRegisterFormValues>({
    resolver: zodResolver(petRegisterSchema),
    mode: "onSubmit",
    defaultValues: {
      petType: null,
      photoFile: null,
      name: "",
      breed: "",
      age: "",
      weight: "",
      gender: null,
      neutered: false,
      notes: "",
    },
  });
}
