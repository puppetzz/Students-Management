import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  deleteFromS3,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
} from "utils/s3.server";
import { v4 as uuid } from "uuid";

export const s3Router = createTRPCRouter({
  // Get a presigned URL for direct client-side upload
  getUploadUrl: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        contentType: z.string(),
        folder: z.string().optional().default("uploads"),
      }),
    )
    .mutation(async ({ input }) => {
      const { fileName, contentType, folder } = input;

      const finalFileName = `${folder}/${uuid()}-${fileName}`;

      const result = await getPresignedUploadUrl(
        finalFileName,
        contentType,
        folder,
      );

      return result;
    }),

  // Delete a file from S3
  deleteFile: publicProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await deleteFromS3(input.key);
      return { success: true };
    }),

  // Get a presigned download URL
  getDownloadUrl: publicProcedure
    .input(
      z.object({
        key: z.string(),
        expiresIn: z.number().optional().default(3600),
      }),
    )
    .query(async ({ input }) => {
      const url = await getPresignedDownloadUrl(input.key, input.expiresIn);
      return { url };
    }),
});
