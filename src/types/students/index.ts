import type { EConduct } from "@prisma/client";
import type { TSubjectForClass } from "../subjects";

export type TStudent = {
  id: number;
  fullName: string;
  dayOfBirth: string;
  pointAvg: number;
};

export type TStudentResponse = {
  id: number;
  firstName: string;
  lastName: string;
  dayOfBirth: Date;
  avgScoredSubjects: number;
  avgOverall: number;
  conduct: EConduct | null;
  createdAt: Date;
  updatedAt: Date;
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
