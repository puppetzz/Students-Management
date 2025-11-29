"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "../trpc/react";
import { uploadImageUsingPresignedUrl } from "utils/s3.client";
import type { ES3Folder } from "common/enums/s3.enum";

export const useUploadImageMutation = () => {
  const getUploadUrl = api.s3.getUploadUrl.useMutation();

  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: ES3Folder }) => {
      const { uploadUrl, key } = await getUploadUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        folder: folder,
      });
      await uploadImageUsingPresignedUrl(file, uploadUrl);
      return key;
    },
  });
};
