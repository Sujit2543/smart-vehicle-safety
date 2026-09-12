import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file buffer to S3. Returns the S3 key.
 */
export async function uploadToS3(
  buffer: Buffer,
  mimeType: string,
  folder: string,
  originalName: string
): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;

  if (env.isDevelopment() && !env.AWS_ACCESS_KEY_ID) {
    logger.info(`[DEV] Simulated S3 upload: ${key}`);
    return key;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    })
  );
  return key;
}

/**
 * Generate a pre-signed URL for reading a private S3 object.
 */
export async function getPresignedUrl(key: string, ttlSeconds = env.AWS_S3_PRESIGNED_URL_TTL): Promise<string> {
  if (env.isDevelopment() && !env.AWS_ACCESS_KEY_ID) {
    return `http://localhost:5000/dev-file/${encodeURIComponent(key)}`;
  }

  const command = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: ttlSeconds });
}

/**
 * Delete an object from S3.
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (env.isDevelopment() && !env.AWS_ACCESS_KEY_ID) {
    logger.info(`[DEV] Simulated S3 delete: ${key}`);
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
}
