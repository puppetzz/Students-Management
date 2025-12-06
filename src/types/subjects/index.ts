import type * as z from "zod";
import type {
  createSubjectSchema,
  updateSubjectSchema,
} from "common/schema/subject";

export type TSubject = {
  id: number;
  code: string;
  name: string;
  scoreCoefficient: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TUpdateSubject = z.infer<typeof updateSubjectSchema>;
export type TCreateSubject = z.infer<typeof createSubjectSchema>;

export type TSubjectForClass = {
  id: number;
  code: string;
  name: string;
  scoreCoefficient: number;
};
