import type {
  createClassesSchema,
  updateClassesSchema,
} from "common/schema/classes";
import type * as z from "zod";
import type { TSubjectForClass } from "../subjects";
import type { TTermClassRelation } from "../terms";

export type TUpdateClasses = z.infer<typeof updateClassesSchema>;
export type TCreateClasses = z.infer<typeof createClassesSchema>;

export type TClasses = {
  id: number;
  name: string;
  description: string | null;
  classSubjects: TClassSubject[];
  term: TTermClassRelation;
  termId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TClassSubject = {
  subject: TSubjectForClass;
};
