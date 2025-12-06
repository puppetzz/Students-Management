import { EConduct, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  CONDUCT_CLASSIFICATION_MAPPINGS,
  EGradeClassification,
} from "common/constants/students";
import { getScoreClassification } from "utils/getGradeClassification";
import { z } from "zod";

import { createTRPCRouter, roleBasedProcedure } from "~/server/api/trpc";
import { EUserRole } from "~/server/kysely/enums";

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
      const where: Prisma.ClassesWhereInput = {
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
        ...(termId ? { termId: termId } : {}),
      };

      const orderBy: Prisma.ClassesOrderByWithAggregationInput[] = [
        {
          name: "asc",
        },
      ];

      if (!termId) {
        orderBy.unshift({ createdAt: "desc" });
      }

      const skip = page && pageSize ? (page - 1) * pageSize : undefined;
      const take = pageSize ?? undefined;

      const [classes, totalCount] = await Promise.all([
        ctx.db.classes.findMany({
          skip,
          take,
          where,
          orderBy,
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            classSubjects: {
              select: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            term: {
              select: {
                id: true,
                name: true,
              },
            },
            termId: true,
          },
        }),
        ctx.db.classes.count({
          select: {
            id: true,
          },
        }),
      ]);

      return {
        data: classes,
        total: totalCount.id,
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
        subjectIds: z.array(z.number()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { subjectIds, ...rest } = input;

      const termExists = await ctx.db.terms.findFirst({
        where: {
          id: rest.termId,
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
          ...rest,
        },
      });

      if (subjectIds) {
        await ctx.db.classSubjects.createMany({
          data: subjectIds.map((id) => ({
            subjectId: id,
            classId: createdClass.id,
          })),
        });
      }

      return createdClass;
    }),

  update: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
        subjectIds: z.array(z.number()),
        name: z.string().optional(),
        termId: z.number().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, subjectIds, termId, description } = input;

      const updatedClass = await ctx.db.$transaction(async (tx) => {
        const [updatedClass] = await Promise.all([
          tx.classes.update({
            where: {
              id,
            },
            data: {
              name: name ?? undefined,
              updatedAt: new Date(),
              termId: termId ?? undefined,
              description: description ?? undefined,
            },
          }),
          tx.classSubjects.deleteMany({
            where: {
              classId: id,
            },
          }),
          tx.classSubjects.createMany({
            data: subjectIds
              ? subjectIds.map((subjectId) => ({
                  subjectId,
                  classId: id,
                }))
              : [],
          }),
        ]);

        return updatedClass;
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
});
