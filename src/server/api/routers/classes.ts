import { EConduct, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  CONDUCT_CLASSIFICATION_MAPPINGS,
  EGradeClassification,
} from "common/constants/students";
import { sql } from "kysely";
import { getScoreClassification } from "utils/getGradeClassification";
import { z } from "zod";

import { createTRPCRouter, roleBasedProcedure } from "~/server/api/trpc";
import { kyselyDB } from "~/server/kysely/db";
import { EUserRole } from "~/server/kysely/enums";
import type { TClasses } from "~/types/classes";
import type { TSubjectForClass } from "~/types/subjects";

const getFinalClassification = (
  scoreClassification: EGradeClassification | null,
  conduct: EConduct | null,
): EGradeClassification | null => {
  if (conduct === null || scoreClassification === null) return null;

  // Poor conduct always results in failure
  if (conduct === EConduct.POOR) return EGradeClassification.FAILED;

  // Excellent conduct maintains the score classification
  if (conduct === EConduct.EXCELLENT) return scoreClassification;

  return (
    CONDUCT_CLASSIFICATION_MAPPINGS[conduct]?.[scoreClassification] ?? null
  );
};

export const classesRouter = createTRPCRouter({
  getAll: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        search: z.string().optional(),
        termId: z.number().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, termId, page, pageSize } = input;

      const skip = page && pageSize ? (page - 1) * pageSize : undefined;
      const take = pageSize ?? undefined;

      const classesQuery = kyselyDB
        .selectFrom("classes")
        .innerJoin(
          "training_program_subjects",
          "classes.training_program_id",
          "training_program_subjects.training_program_id",
        )
        .innerJoin(
          "subjects",
          "training_program_subjects.subject_id",
          "subjects.id",
        )
        .innerJoin("terms", "classes.term_id", "terms.id")
        .where("classes.is_deleted", "=", false)
        .where("terms.is_deleted", "=", false)
        .$if(!!search, (qb) =>
          qb.where("classes.name", "ilike", `%${search!}%`),
        )
        .$if(!!termId, (qb) => qb.where("classes.term_id", "=", termId!));

      const classesQueryCompiled = classesQuery
        .select([
          "classes.id",
          "classes.name",
          "classes.description",
          "classes.created_at as createdAt",
          "classes.updated_at as updatedAt",
          "classes.term_id as termId",
          "terms.name as termName",
          "classes.training_program_id as trainingProgramId",
          sql<TSubjectForClass[]>`JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', subjects.id,
              'name', subjects.name,
              'description', subjects.description
            )
          ) FILTER (WHERE subjects.id IS NOT NULL)`.as("subjects"),
        ])
        .groupBy(["classes.id", "terms.name"])
        .$if(!!termId, (qb) => qb.orderBy("classes.created_at", "desc"))
        .orderBy("classes.name", "asc")
        .offset(skip ?? 0)
        .limit(take ?? 10)
        .compile();

      const countClassesQueryCompiled = classesQuery
        .select([sql<number>`COUNT(DISTINCT classes.id)`.as("count")])
        .compile();

      const [classes, totalCount] = await Promise.all([
        ctx.db.$queryRawUnsafe<TClasses[]>(
          classesQueryCompiled.sql,
          ...classesQueryCompiled.parameters,
        ),
        ctx.db.$queryRawUnsafe<{ count: bigint }[]>(
          countClassesQueryCompiled.sql,
          ...countClassesQueryCompiled.parameters,
        ),
      ]);

      return {
        data: classes,
        total: Number(totalCount[0]?.count) ?? 0,
      };
    }),

  getById: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const classes = await ctx.db.classes.findFirst({
        where: {
          id,
          isDeleted: false,
        },
      });

      return classes ?? null;
    }),

  create: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        name: z.string(),
        termId: z.number(),
        description: z.string().optional(),
        trainingProgramId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const termExists = await ctx.db.terms.findFirst({
        where: {
          id: input.termId,
        },
      });

      if (!termExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Khóa không tồn tại",
        });
      }

      const createdClass = await ctx.db.classes.create({
        data: {
          ...input,
        },
      });

      return createdClass;
    }),

  update: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
        trainingProgramId: z.number().optional(),
        name: z.string().optional(),
        termId: z.number().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, trainingProgramId, termId, description } = input;

      const [existTerm, existTrainingProgram] = await Promise.all([
        ctx.db.terms.findUnique({
          where: {
            id: termId,
            isDeleted: false,
          },
        }),
        ctx.db.trainingProgram.findUnique({
          where: {
            id: trainingProgramId,
          },
        }),
      ]);

      if (!existTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Khóa học không tồn tại",
        });
      }
      if (!existTrainingProgram)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chương trình đào tạo không tồn tại",
        });

      const updatedClass = ctx.db.classes.update({
        where: {
          id,
        },
        data: {
          name: name ?? undefined,
          updatedAt: new Date(),
          termId: termId ?? undefined,
          description: description ?? undefined,
          trainingProgramId: trainingProgramId ?? undefined,
        },
      });

      return updatedClass;
    }),

  getGradeStatistics: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
  ])
    .input(
      z.object({
        classId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { classId } = input;

      // Get all students with their exam results for the class
      const students = await ctx.db.students.findMany({
        where: {
          classId,
        },
        select: {
          id: true,
          avgScoredSubjects: true,
          avgOverall: true,
          conduct: true,
          examResults: {
            select: {
              scored: true,
            },
          },
        },
      });

      if (students.length === 0) {
        return {
          total: 0,
          currentClassificationStats: {},
          finalClassificationStats: {},
        };
      }

      // Calculate classifications for each student
      const currentClassificationCounts: Record<string, number> = {};
      const finalClassificationCounts: Record<string, number> = {};

      students.forEach((student) => {
        const haveAnyScores = student.examResults.length > 0;

        // Calculate current classification
        const currentClassification = !haveAnyScores
          ? null
          : getScoreClassification(student.avgScoredSubjects);

        if (currentClassification) {
          currentClassificationCounts[currentClassification] =
            (currentClassificationCounts[currentClassification] ?? 0) + 1;
        }

        // Calculate final classification
        const finalClassification = student.avgOverall
          ? getFinalClassification(
              getScoreClassification(student.avgOverall),
              student.conduct,
            )
          : null;

        if (finalClassification) {
          finalClassificationCounts[finalClassification] =
            (finalClassificationCounts[finalClassification] ?? 0) + 1;
        }
      });

      const total = students.length;

      // Calculate percentages
      const currentClassificationStats: Record<
        string,
        { count: number; percentage: number }
      > = {};
      const finalClassificationStats: Record<
        string,
        { count: number; percentage: number }
      > = {};

      Object.entries(currentClassificationCounts).forEach(([key, count]) => {
        currentClassificationStats[key] = {
          count,
          percentage: (count / total) * 100,
        };
      });

      Object.entries(finalClassificationCounts).forEach(([key, count]) => {
        finalClassificationStats[key] = {
          count,
          percentage: (count / total) * 100,
        };
      });

      return {
        total,
        currentClassificationStats,
        finalClassificationStats,
      };
    }),

  delete: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const classExists = await ctx.db.classes.findFirst({
        where: {
          id,
          isDeleted: false,
        },
      });

      if (!classExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lớp học không tồn tại",
        });
      }

      const deletedClass = await ctx.db.classes.update({
        where: {
          id,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return deletedClass;
    }),

  restore: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const classExists = await ctx.db.classes.findFirst({
        where: {
          id,
          isDeleted: true,
        },
      });

      if (!classExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lớp học đã bị xóa không tồn tại",
        });
      }

      const restoredClass = await ctx.db.classes.update({
        where: {
          id,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      return restoredClass;
    }),
});
