import type { EConduct } from "@prisma/client";
import type { TSubjectForClass } from "../subjects";
import type * as z from "zod";
import type {
  batchUpdateGradesSchema,
  createStudentSchema,
  updateGradesSchema,
  updateStudentSchema,
} from "common/schema/student";
import type { TClassesWithStudentsRelation } from "../classes";
import type { EGradeClassification } from "common/constants/students";

export type TStudent = {
  id: number;
  firstName: string;
  lastName: string;
  dayOfBirth: Date;
  createdAt: Date;
  updatedAt: Date;
  vneid: string;
  classId: number;
  class: TClassesWithStudentsRelation;
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
  currentClassification: EGradeClassification | null;
  finalClassification: EGradeClassification | null;
  class: TClassesWithStudentsRelation;
};

export type TExampleResultClassRelation = {
  createdAt: Date;
  updatedAt: Date;
  scored: number;
  subject: TSubjectForClass;
};

export type TCreateStudent = z.infer<typeof createStudentSchema>;
export type TUpdateStudent = z.infer<typeof updateStudentSchema>;
export type TUpdateGrades = z.infer<typeof updateGradesSchema>;
export type TBatchUpdateGrades = z.infer<typeof batchUpdateGradesSchema>;

export type ExcelStudentGradesRowData = {
  STT?: string | number;
  CCCD?: string;
  RL?: string;
  [key: string]: string | number | undefined;
};
