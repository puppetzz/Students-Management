import { type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const classesRouter = createTRPCRouter({
  getAll: publicProcedure
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

  getById: publicProcedure
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

  create: publicProcedure
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

  update: publicProcedure
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
});
