import { EConduct, type Prisma } from "@prisma/client";
import { transformUpdateData } from "utils/transformUpdateData";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const CLASSIFICATION_THRESHOLDS = {
  EXCELLENT: 9,
  GOOD: 7,
  AVERAGE: 5,
} as const;

const getScoreClassification = (avgScore: number | null): EConduct | null => {
  if (avgScore === null) return null;
  if (avgScore >= CLASSIFICATION_THRESHOLDS.EXCELLENT)
    return EConduct.EXCELLENT;
  if (avgScore >= CLASSIFICATION_THRESHOLDS.GOOD) return EConduct.GOOD;
  if (avgScore >= CLASSIFICATION_THRESHOLDS.AVERAGE) return EConduct.AVERAGE;
  return EConduct.POOR;
};

const getFinalClassification = (
  scoreClassification: EConduct | null,
  conduct: EConduct | null,
): EConduct | null | undefined => {
  // If both are null, return null
  if (scoreClassification === null && conduct === null) return null;

  // If one is null, return the other
  if (scoreClassification === null) return conduct;
  if (conduct === null) return scoreClassification;

  // Define the hierarchy (lower index = better classification)
  const hierarchy = [
    EConduct.EXCELLENT,
    EConduct.GOOD,
    EConduct.AVERAGE,
    EConduct.POOR,
  ];

  const scoreIndex = hierarchy.indexOf(scoreClassification);
  const conductIndex = hierarchy.indexOf(conduct);

  // Return the worse classification (higher index)
  return hierarchy[Math.max(scoreIndex, conductIndex)];
};

export const studentRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).optional(),
        search: z.string().optional(),
        classId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, classId, search } = input;

      const take = pageSize ?? undefined;
      const skip = pageSize && page ? pageSize * (page - 1) : undefined;

      const where: Prisma.StudentsWhereInput = {
        ...(classId ? { classId: classId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [students, totalRecords] = await Promise.all([
        ctx.db.students.findMany({
          where,
          orderBy: { firstName: "asc" },
          skip,
          take,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dayOfBirth: true,
            createdAt: true,
            updatedAt: true,
            hometown: true,
            permanentAddress: true,
            vneid: true,
          },
        }),

        ctx.db.subjects.count({
          select: {
            id: true,
          },
        }),
      ]);

      return {
        data: students,
        total: totalRecords.id,
      };
    }),

  getWithGrades: publicProcedure
    .input(
      z.object({
        classId: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { classId, search } = input;

      const where: Prisma.StudentsWhereInput = {
        ...(classId ? { classId: classId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
              ],
            }
          : {}),
      };

      const students = await ctx.db.students.findMany({
        where,
        orderBy: { firstName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dayOfBirth: true,
          avgOverall: true,
          avgScoredSubjects: true,
          conduct: true,
          createdAt: true,
          updatedAt: true,
          examResults: {
            select: {
              scored: true,
              createdAt: true,
              updatedAt: true,
              subject: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      const processedStudentsData = students.map((student) => {
        const haveAnyScores = student.examResults.length > 0;

        const currentClassification = !haveAnyScores
          ? null
          : getScoreClassification(student.avgScoredSubjects);

        const finalClassification =
          getFinalClassification(
            getScoreClassification(student.avgOverall),
            student.conduct,
          ) ?? null;

        return {
          ...student,
          currentClassification,
          finalClassification,
        };
      });

      return processedStudentsData;
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const students = await ctx.db.students.findFirst({
        where: {
          id,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dayOfBirth: true,
          avgOverall: true,
          avgScoredSubjects: true,
          conduct: true,
          createdAt: true,
          updatedAt: true,
          examResults: {
            select: {
              scored: true,
              createdAt: true,
              updatedAt: true,
              subject: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      return students ?? null;
    }),

  create: publicProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        dayOfBirth: z.date(),
        classId: z.number(),
        hometown: z.string().optional(),
        permanentAddress: z.string().optional(),
        vneid: z.string(),
        conduct: z
          .enum(Object.values(EConduct) as [string, ...string[]])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.students.create({
        data: {
          ...input,
          conduct: input.conduct ? (input.conduct as EConduct) : undefined,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dayOfBirth: z.date().optional(),
        conduct: z
          .enum(Object.values(EConduct) as [string, ...string[]])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const transformsData = transformUpdateData(data);

      return ctx.db.subjects.update({
        where: {
          id,
        },
        data: transformsData,
      });
    }),
});
