import * as z from "zod";

export const updateClassesSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  trainingProgramId: z.number().optional(),
  termName: z.string().optional(),
  termId: z.number().optional(),
});

export const createClassesSchema = z.object({
  name: z.string(),
  termId: z.number(),
  trainingProgramId: z.number(),
  description: z.string().optional(),
});
