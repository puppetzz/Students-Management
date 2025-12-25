import { createTRPCRouter, publicProcedure, roleBasedProcedure } from "../trpc";
import * as z from "zod";
import { kyselyDB } from "~/server/kysely/db";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { sql } from "kysely";
import type { TTrainingProgramResponse } from "~/types/trainning-programs";
import {
  createTrainingProgramSchema,
  updateTrainingProgramSchema,
} from "common/schema/training-program";
import { EUserRole, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const trainingProgramsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          page: z.number().optional().default(DEFAULT_PAGE),
          pageSize: z.number().optional().default(DEFAULT_PAGE_SIZE),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize } = input ?? {};
      const skip = page && pageSize ? (page - 1) * pageSize : DEFAULT_PAGE;
      const take = pageSize ?? DEFAULT_PAGE_SIZE;

      const programsQuery = kyselyDB
        .selectFrom("training_programs")
        .where("training_programs.is_deleted", "=", false)
        .leftJoin(
          "training_program_subjects",
          "training_programs.id",
          "training_program_subjects.training_program_id",
        )
        .leftJoin(
          "subjects",
          "training_program_subjects.subject_id",
          "subjects.id",
        )
        .$if(!!search, (qb) =>
          qb.where("training_programs.name", "ilike", `%${search!}%`),
        );

      const programsQueryCompiled = programsQuery
        .select([
          "training_programs.id",
          "training_programs.name",
          "training_programs.description",
          "training_programs.created_at as createdAt",
          "training_programs.updated_at as updatedAt",
          sql<
            {
              subjectId: number;
              subjectName: string;
              subjectDescription: string;
            }[]
          >`JSON_AGG(
            JSON_BUILD_OBJECT(
              'subjectId', subjects.id,
              'subjectName', subjects.name,
              'subjectDescription', subjects.description
            )
          ) FILTER (WHERE subjects.id IS NOT NULL)`.as("subjects"),
        ])
        .groupBy(["training_programs.id"])
        .orderBy("training_programs.created_at", "desc")
        .orderBy("training_programs.name", "asc")
        .offset(skip)
        .limit(take)
        .compile();

      const countQueryCompiled = programsQuery
        .select((eb) =>
          eb.fn.count("training_programs.id").distinct().as("count"),
        )
        .compile();

      const [programs, countResult] = await Promise.all([
        ctx.db.$queryRawUnsafe<TTrainingProgramResponse[]>(
          programsQueryCompiled.sql,
          ...programsQueryCompiled.parameters,
        ),
        ctx.db.$queryRawUnsafe<{ count: bigint }[]>(
          countQueryCompiled.sql,
          ...countQueryCompiled.parameters,
        ),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        data: programs ?? [],
        total,
      };
    }),

  getOptions: publicProcedure.query(async ({ ctx }) => {
    const programs = await ctx.db.trainingProgram.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

    return programs;
  }),

  create: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(createTrainingProgramSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, description, subjectIds } = input;

      if (!subjectIds?.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chương trình đào tạo phải có ít nhất một môn học!",
        });

      const subjects = await ctx.db.subjects.findMany({
        where: {
          id: { in: subjectIds },
          isDeleted: false,
        },
      });

      if (subjects.length !== (subjectIds?.length ?? 0)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Danh sách môn học chứa môn học không tồn tại hoặc đã bị xóa!",
        });
      }

      const createdProgram = await ctx.db.$transaction(async (tx) => {
        const program = await tx.trainingProgram.create({
          data: {
            name,
            description: description ?? null,
          },
        });

        if (subjectIds && subjectIds.length > 0) {
          await tx.trainingProgramSubjects.createMany({
            data: subjectIds.map((subjectId) => ({
              trainingProgramId: program.id,
              subjectId,
            })),
          });
        }

        return program;
      });

      return createdProgram;
    }),

  update: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(updateTrainingProgramSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, subjectIds } = input;

      const [programExists, subjects] = await Promise.all([
        ctx.db.trainingProgram.findUnique({
          where: { id, isDeleted: false },
          select: { id: true, trainingProgramSubjects: true },
        }),
        ctx.db.subjects.findMany({
          where: {
            id: { in: subjectIds ?? [] },
            isDeleted: false,
          },
        }),
      ]);

      if (subjectIds && subjectIds.length < 1)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chương trình đào tạo phải có ít nhất một môn học!",
        });

      if (subjectIds && subjects.length !== subjectIds.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Danh sách môn học chứa môn học không tồn tại hoặc đã bị xóa!",
        });

      if (!programExists)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chương trình đào tạo không tồn tại",
        });

      const oldSubjectIds: number[] =
        programExists?.trainingProgramSubjects.map(
          (tps: { subjectId: number }) => tps.subjectId,
        ) ?? [];

      const removedSubjectIds = oldSubjectIds.filter(
        (oldId) => !subjectIds?.includes(oldId),
      );
      const addedSubjectIds = subjectIds
        ? subjectIds.filter((newId) => !oldSubjectIds.includes(newId))
        : [];

      const [updatedProgramsStudent, addedSubjects] = await Promise.all([
        ctx.db.students.findMany({
          where: {
            class: {
              trainingProgramId: id,
            },
          },
          select: {
            id: true,
            examResults: {
              select: {
                subject: {
                  select: {
                    id: true,
                    scoreCoefficient: true,
                  },
                },
                scored: true,
              },
              where: {
                subjectId: {
                  notIn: removedSubjectIds,
                },
              },
            },
          },
        }),
        ctx.db.subjects.findMany({
          where: {
            id: { in: addedSubjectIds },
          },
          select: {
            id: true,
            scoreCoefficient: true,
          },
        }),
      ]);

      const updatedStudentAvgs = updatedProgramsStudent.map((student) => {
        // Calculate weighted scores from existing exam results
        const { scoreCoefficient, sumOfScored } = student.examResults.reduce(
          (acc, { subject, scored }) => ({
            scoreCoefficient: acc.scoreCoefficient + subject.scoreCoefficient,
            sumOfScored: acc.sumOfScored + scored * subject.scoreCoefficient,
          }),
          { scoreCoefficient: 0, sumOfScored: 0 },
        );

        // Add score coefficients from newly added subjects (no scores yet)
        const totalScoreCoefficient =
          scoreCoefficient +
          addedSubjects.reduce((sum, subj) => sum + subj.scoreCoefficient, 0);

        const currentAvgScore = totalScoreCoefficient
          ? sumOfScored / totalScoreCoefficient
          : 0;

        // Set avgOverall only if student has completed all existing subjects
        const avgOverall =
          student.examResults.length === subjectIds!.length
            ? currentAvgScore
            : undefined;

        return {
          id: student.id,
          currentAvgScore,
          avgOverall,
        };
      });

      let caseExpression = kyselyDB.case().when("id", "=", -1).then(0);
      let caseExpressionOverall = kyselyDB
        .case()
        .when("id", "=", -1)
        .then(sql`NULL`);
      for (const student of updatedStudentAvgs) {
        caseExpression = caseExpression
          .when("id", "=", student.id)
          .then(student.currentAvgScore);
        caseExpressionOverall = caseExpressionOverall
          .when("id", "=", student.id)
          .then(student.avgOverall ?? sql`NULL`);
      }

      const updateAvgsQuery = kyselyDB
        .updateTable("students")
        .set({
          avg_scored_subjects: sql<number>`${caseExpression.else(sql`avg_scored_subjects`).end()}`,
          avg_overall: sql<
            number | null
          >`${caseExpressionOverall.else(sql`avg_overall`).end()}`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          "id",
          "in",
          updatedProgramsStudent.length
            ? updatedProgramsStudent.map((s) => s.id)
            : [-1],
        )
        .compile();

      const updatedProgram = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.trainingProgram.update({
          where: { id },
          data: {
            name: name ?? undefined,
            description: description !== undefined ? description : undefined,
            updatedAt: new Date(),
          },
        });

        if (subjectIds) {
          await tx.trainingProgramSubjects.deleteMany({
            where: { trainingProgramId: id },
          });

          if (subjectIds.length > 0) {
            await tx.trainingProgramSubjects.createMany({
              data: subjectIds.map((subjectId) => ({
                trainingProgramId: id,
                subjectId,
              })),
            });
          }
          await tx.examResults.deleteMany({
            where: {
              subjectId: { in: removedSubjectIds },
              student: {
                class: {
                  trainingProgramId: id,
                },
              },
            },
          });

          await tx.$executeRawUnsafe(
            updateAvgsQuery.sql,
            ...updateAvgsQuery.parameters,
          );
        }

        return updated;
      });

      return updatedProgram;
    }),

  delete: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [programExists, hasClasses] = await Promise.all([
        ctx.db.trainingProgram.findUnique({
          where: { id: input.id, isDeleted: false },
        }),
        ctx.db.classes.findFirst({
          where: {
            trainingProgramId: input.id,
          },
        }),
      ]);

      if (!programExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chương trình đào tạo không tồn tại",
        });
      }

      if (hasClasses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Không thể xóa chương trình đào tạo vì đang tồn tại lớp học sử dụng chương trình này",
        });
      }

      const deletedProgram = await ctx.db.trainingProgram.update({
        where: { id: input.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return deletedProgram;
    }),

  restore: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const programExists = await ctx.db.trainingProgram.findUnique({
        where: { id: input.id, isDeleted: true },
      });

      if (!programExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chương trình đào tạo đã bị xóa không tồn tại",
        });
      }

      const restoredProgram = await ctx.db.trainingProgram.update({
        where: { id: input.id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      return restoredProgram;
    }),
});
