import * as z from "zod";

export const createTermSchema = z.object({
  name: z.string(),
  schoolYear: z.string(),
});

export const updateTermSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  schoolYear: z.string().optional(),
});
