import * as z from "zod";

export const createTrainingProgramSchema = z.object({
  name: z.string().min(1, "Tên chương trình đào tạo không được để trống"),
  description: z.string().optional().nullable(),
  subjectIds: z.array(z.number()).optional(),
});

export const updateTrainingProgramSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  subjectIds: z.array(z.number()).optional(),
});
