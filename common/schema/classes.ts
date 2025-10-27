import * as z from "zod";

export const updateClassesSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  classSubjects: z
    .array(
      z.object({
        subject: z.object({
          id: z.number(),
          name: z.string(),
        }),
      }),
    )
    .optional(),
  updatedSubjectIds: z.array(z.number()),
  term: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .optional(),
  termId: z.number().optional(),
});

export const createClassesSchema = z.object({
  name: z.string(),
  termId: z.number(),
  description: z.string().optional(),
  subjectIds: z.array(z.number()).optional(),
});
