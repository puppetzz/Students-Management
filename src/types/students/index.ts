import type { EConduct } from "@prisma/client";
import type { TSubjectForClass } from "../subjects";
import type * as z from "zod";
import type { createStudentSchema } from "common/schema/student";

export type TStudent = {
  id: number;
  firstName: string;
  lastName: string;
  dayOfBirth: Date;
  createdAt: Date;
  updatedAt: Date;
  vneid: string;
};

export type TStudentInfoResponse = TStudent & {
  hometown: string | null;
  permanentAddress: string | null;
};

export type TStudentWithGradesResponse = TStudent & {
  conduct: EConduct | null;
  avgScoredSubjects: number;
  avgOverall: number;
  examResults: TExampleResultClassRelation[];
  currentClassification: EConduct | null;
  finalClassification: EConduct | null;
};

export type TExampleResultClassRelation = {
  createdAt: Date;
  updatedAt: Date;
  scored: number;
  subject: TSubjectForClass;
};

export type TCreateStudent = z.infer<typeof createStudentSchema>;
