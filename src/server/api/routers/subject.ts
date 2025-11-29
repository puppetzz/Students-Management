import { type Prisma } from "@prisma/client";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  roleBasedProcedure,
} from "~/server/api/trpc";
import { EUserRole } from "~/server/kysely/enums";

export const subjectRouter = createTRPCRouter({
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

      const [subjects, totalRecords] = await Promise.all([
        ctx.db.subjects.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take,
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, code } = input;
      return ctx.db.subjects.update({
        where: {
          id,
        },
        data: {
          name: name,
          code: code,
          description: description,
          updatedAt: new Date(),
        },
      });
    }),
});
