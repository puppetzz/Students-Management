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
import { EUserRole } from "@prisma/client";
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

      const programExists = await ctx.db.trainingProgram.findUnique({
        where: { id },
      });

      if (!programExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chương trình đào tạo không tồn tại",
        });
      }

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
        }

        return updated;
      });

      return updatedProgram;
    }),

  delete: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const programExists = await ctx.db.trainingProgram.findUnique({
        where: { id: input.id },
      });

      if (!programExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chương trình đào tạo không tồn tại",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.trainingProgramSubjects.deleteMany({
          where: { trainingProgramId: input.id },
        });

        await tx.trainingProgram.delete({
          where: { id: input.id },
        });
      });

      return { success: true };
    }),
});
