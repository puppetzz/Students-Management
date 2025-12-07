import type {
  createClassesSchema,
  updateClassesSchema,
} from "common/schema/classes";
import type * as z from "zod";
import type { TSubjectForClass } from "../subjects";

export type TUpdateClasses = z.infer<typeof updateClassesSchema>;
export type TCreateClasses = z.infer<typeof createClassesSchema>;

export type TClasses = {
  id: number;
  name: string;
  description: string | null;
  trainingProgramId: number;
  subjects: TSubjectForClass[];
  termId: number;
  termName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TClassSubject = {
  subject: TSubjectForClass;
};

export type TClassesWithStudentsRelation = {
  termId: number;
};
