import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  roleBasedProcedure,
} from "~/server/api/trpc";
import { hashPassword, verifyPassword } from "utils/password";
import { TRPCError } from "@trpc/server";
import { EUserRole } from "~/server/kysely/enums";

export const userRouter = createTRPCRouter({
  create: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this username already exists",
        });
      }

      // Hash the password with salt
      const hash = await hashPassword(input.password);

      // Create the user with hashed password
      const user = await ctx.db.user.create({
        data: {
          passwordHash: hash,
          username: input.username,
        },
      });

      return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      };
    }),

  getAll: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(10),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const skip = (page - 1) * pageSize;

      const where = search
        ? {
            username: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {};

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        data: users,
        total,
        page,
        pageSize,
      };
    }),

  createUser: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.nativeEnum(EUserRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this username already exists",
        });
      }

      // Hash the password
      const hash = await hashPassword(input.password);

      // Create the user
      const user = await ctx.db.user.create({
        data: {
          username: input.username,
          passwordHash: hash,
          role: input.role,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  deleteUser: roleBasedProcedure([EUserRole.SUPER_ADMIN])
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent deleting the current user
      if (user.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account",
        });
      }

      // Delete the user
      await ctx.db.user.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        oldPassword: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Hash the new password
      const hash = await hashPassword(input.newPassword);

      // Update the user's password
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: hash,
        },
      });

      return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        oldPassword: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the user can only change their own password
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only change your own password",
        });
      }

      // Get the user's current password hash
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { passwordHash: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify the old password
      const isValid = await verifyPassword(
        input.oldPassword,
        user.passwordHash,
      );
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Old password is incorrect",
        });
      }

      // Hash the new password
      const hash = await hashPassword(input.newPassword);

      // Update the user's password
      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: hash,
        },
      });

      return {
        success: true,
      };
    }),
});
