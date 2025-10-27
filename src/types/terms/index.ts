import type { createTermSchema, updateTermSchema } from "common/schema/term";
import type * as z from "zod";

export type TTerm = {
  id: number;
  name: string;
  schoolYear: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TTermClassRelation = {
  id: number;
  name: string;
};

export type TUpdateTerm = z.infer<typeof updateTermSchema>;
export type TCreateTerm = z.infer<typeof createTermSchema>;
