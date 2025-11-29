import axios from "axios";

/**
 * Upload image to S3 using presigned URL (for frontend with axios)
 * @param file - File object from frontend
 * @param presignedUrl - Presigned URL for upload
 * @returns Object containing the uploaded file details
 */
export async function uploadImageUsingPresignedUrl(
  file: File,
  presignedUrl: string,
): Promise<{ success: boolean }> {
  // Upload file using fetch (can be used with axios in frontend)
  const uploadResponse = await axios.put(presignedUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
  });

  if (uploadResponse?.status !== 200) {
    throw new Error(`Upload failed: ${uploadResponse.statusText}`);
  }

  return {
    success: true,
  };
}
