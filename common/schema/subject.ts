import * as z from "zod";

export const updateSubjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
});

export const createSubjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
});
