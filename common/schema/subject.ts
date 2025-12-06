import * as z from "zod";

const materialSchema = z.object({
  name: z.string().min(1, "Tên vật chất không được để trống"),
  unit: z.string().optional(),
  amount: z.string().min(1, "Số lượng không được để trống"),
  note: z.string().optional(),
});

export const updateSubjectSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scoreCoefficient: z.number().min(1).default(1),
  materials: z.array(materialSchema).optional().default([]),
});

export const createSubjectSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scoreCoefficient: z.number().min(1).default(1),
  materials: z.array(materialSchema).optional().default([]),
});
