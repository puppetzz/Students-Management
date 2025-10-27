import { type Prisma } from "@prisma/client";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const subjectRouter = createTRPCRouter({
  getAll: publicProcedure
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

  getById: publicProcedure
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

  create: publicProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.subjects.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, description } = input;
      return ctx.db.subjects.update({
        where: {
          id,
        },
        data: {
          name: name,
          description: description,
          updatedAt: new Date(),
        },
      });
    }),
});
