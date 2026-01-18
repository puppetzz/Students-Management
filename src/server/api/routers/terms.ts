import { type Prisma } from "@prisma/client";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "common/constants";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  roleBasedProcedure,
} from "~/server/api/trpc";
import { EUserRole } from "~/server/kysely/enums";

export const termRouter = createTRPCRouter({
  getAll: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
    EUserRole.USER,
  ])
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize } = input;
      const where: Prisma.TermsWhereInput = {
        isDeleted: false,
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      };

      const skip = page && pageSize ? (page - 1) * pageSize : undefined;
      const take = pageSize ?? undefined;

      const [terms, totalRecords] = await Promise.all([
        ctx.db.terms.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { name: "asc" }],
          skip,
          take,
        }),
        ctx.db.terms.count({
          where,
          select: {
            id: true,
          },
        }),
      ]);

      return {
        data: terms,
        total: totalRecords.id,
      };
    }),

  getById: roleBasedProcedure([
    EUserRole.ADMIN,
    EUserRole.SUPER_ADMIN,
    EUserRole.USER,
  ])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const term = await ctx.db.terms.findFirst({
        where: {
          id,
          isDeleted: false,
        },
      });

      return term ?? null;
    }),

  create: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(z.object({ name: z.string(), schoolYear: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.terms.create({
        data: {
          name: input.name,
          schoolYear: input.schoolYear,
        },
      });
    }),

  update: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        schoolYear: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, schoolYear } = input;
      return ctx.db.terms.update({
        where: {
          id,
        },
        data: {
          name: name ?? undefined,
          schoolYear: schoolYear ?? undefined,
          updatedAt: new Date(),
        },
      });
    }),

  delete: roleBasedProcedure([EUserRole.ADMIN, EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const termExists = await ctx.db.terms.findFirst({
        where: {
          id,
          isDeleted: false,
        },
      });

      if (!termExists) {
        throw new Error("Khóa học không tồn tại");
      }

      return ctx.db.terms.update({
        where: {
          id,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }),

  restore: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const termExists = await ctx.db.terms.findFirst({
        where: {
          id,
          isDeleted: true,
        },
      });

      if (!termExists) {
        throw new Error("Khóa học đã bị xóa không tồn tại");
      }

      return ctx.db.terms.update({
        where: {
          id,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    }),
});
