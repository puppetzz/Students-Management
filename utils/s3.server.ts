import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from "axios";
import { env } from "~/env";

// Initialize S3 Client
const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export interface UploadToS3Params {
  file: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}

export interface UploadToS3Result {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Upload a file to S3
 * @param params - Upload parameters
 * @returns Object containing the S3 key and URL
 */
export async function uploadToS3({
  file,
  fileName,
  contentType,
  folder = "uploads",
}: UploadToS3Params): Promise<UploadToS3Result> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const url = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    key,
    url,
    bucket: env.AWS_S3_BUCKET_NAME,
  };
}

/**
 * Delete a file from S3
 * @param key - The S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate a presigned URL for uploading directly from the client
 * @param fileName - Name of the file
 * @param contentType - MIME type of the file
 * @param folder - Optional folder path
 * @param expiresIn - URL expiration time in seconds (default: 300)
 * @returns Presigned URL and the key
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder = "uploads",
  expiresIn = 300,
): Promise<{ uploadUrl: string; key: string; fileUrl: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn,
  });

  const fileUrl = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    fileUrl,
  };
}

/**
 * Generate a presigned URL for downloading a file
 * @param key - The S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Presigned URL
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    if (typeof url !== "string") {
      throw new Error("Failed to generate valid presigned URL");
    }
    return url;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate presigned download URL: ${message}`);
  }
}

export { s3Client };
