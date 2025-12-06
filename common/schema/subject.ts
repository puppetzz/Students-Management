import * as z from "zod";

export const updateSubjectSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scoreCoefficient: z.number().min(1).default(1),
});

export const createSubjectSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scoreCoefficient: z.number().min(1).default(1),
});
