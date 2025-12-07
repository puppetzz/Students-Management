import type {
  createTrainingProgramSchema,
  updateTrainingProgramSchema,
} from "common/schema/training-program";
import type * as z from "zod";

export type TTrainingProgramResponse = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  subjects: {
    subjectId: number;
    subjectName: string;
    subjectDescription: string | null;
  }[];
};

export type TCreateTrainingProgram = z.infer<
  typeof createTrainingProgramSchema
>;
export type TUpdateTrainingProgram = z.infer<
  typeof updateTrainingProgramSchema
>;
