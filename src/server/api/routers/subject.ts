import { type Prisma } from "@prisma/client";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { sql } from "node_modules/kysely/dist/esm/raw-builder/sql";
import { z } from "zod";

import { createTRPCRouter, roleBasedProcedure } from "~/server/api/trpc";
import { kyselyDB } from "~/server/kysely/db";
import { EUserRole } from "~/server/kysely/enums";
import type { TSubject, TSubjectMaterial } from "~/types/subjects";

export const subjectRouter = createTRPCRouter({
  // Lightweight API for select boxes - returns only id and name
  getOptions: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).optional(),
        search: z.string().optional(),
        classId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, classId } = input;

      const where: Prisma.SubjectsWhereInput = {
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
        ...(classId
          ? {
              classSubjects: {
                some: {
                  classId: classId,
                },
              },
            }
          : {}),
      };

      const [subjects, totalRecords] = await Promise.all([
        ctx.db.subjects.findMany({
          where,
          orderBy: { name: "asc" },
          ...(page && pageSize
            ? {
                skip: pageSize * (page - 1),
                take: pageSize,
              }
            : {}),
          select: {
            id: true,
            name: true,
            code: true,
            scoreCoefficient: true,
          },
        }),
        ctx.db.subjects.count({
          where,
          select: {
            id: true,
          },
        }),
      ]);

      return {
        data: subjects,
        total: totalRecords.id,
      };
    }),

  // Full API for displaying subjects on screen with pagination
  getAll: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        page: z.number().min(1).default(DEFAULT_PAGE),
        pageSize: z.number().min(1).default(DEFAULT_PAGE_SIZE),
        search: z.string().optional(),
        classId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, classId } = input;

      const take = pageSize;
      const skip = pageSize * (page - 1);

      const where: Prisma.SubjectsWhereInput = {
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
        ...(classId
          ? {
              classSubjects: {
                some: {
                  classId: classId,
                },
              },
            }
          : {}),
      };

      const subjectQueryCompiled = kyselyDB
        .selectFrom("subjects")
        .select([
          "id",
          "code",
          "name",
          "score_coefficient as scoreCoefficient",
          "description",
        ])
        .select(sql<TSubjectMaterial[]>`material`.as("material"))
        .$if(!!search, (qb) => qb.where("name", "ilike", `%${search}%`))
        .$if(!!classId, (qb) =>
          qb.where((sqb) =>
            sqb.exists(
              sqb
                .selectFrom("class_subjects")
                .whereRef("class_subjects.subject_id", "=", "subjects.id")
                .where("class_subjects.class_id", "=", classId!),
            ),
          ),
        )
        .offset(skip)
        .limit(take)
        .orderBy("name", "asc")
        .compile();

      const [subjects, totalRecords] = await Promise.all([
        ctx.db.$queryRawUnsafe<TSubject[]>(
          subjectQueryCompiled.sql,
          ...subjectQueryCompiled.parameters,
        ),

        ctx.db.subjects.count({
          where,
          select: {
            id: true,
          },
        }),
      ]);

      return {
        data: subjects,
        total: totalRecords.id,
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
      const subject = await ctx.db.subjects.findFirst({
        where: {
          id,
        },
      });

      return subject ?? null;
    }),

  create: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        scoreCoefficient: z.number().min(1).default(1),
        material: z
          .array(
            z.object({
              name: z.string(),
              unit: z.string().optional(),
              amount: z.string(),
              note: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.subjects.create({
        data: {
          ...input,
        },
      });
    }),

  update: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        scoreCoefficient: z.number().min(1).default(1),
        material: z
          .array(
            z.object({
              name: z.string(),
              unit: z.string().optional(),
              amount: z.string(),
              note: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, code, scoreCoefficient, material } = input;
      return ctx.db.subjects.update({
        where: {
          id,
        },
        data: {
          name: name,
          code: code,
          description: description,
          scoreCoefficient: scoreCoefficient,
          material: material ?? undefined,
          updatedAt: new Date(),
        },
      });
    }),
});
