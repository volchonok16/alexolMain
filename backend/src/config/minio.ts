import { Client } from 'minio';
import { config } from './env.js';

export const minioClient = new Client({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
  pathStyle: true,
});

export const minioBucket = config.minio.bucket;

let minioReady = false;

export function isMinioReady(): boolean {
  return minioReady;
}

const publicReadPolicy = (bucket: string) =>
  JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicRead',
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });

const MINIO_INIT_TIMEOUT_MS = 8000;

async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(minioBucket);
  if (!exists) {
    await minioClient.makeBucket(minioBucket);
    console.log(`[MinIO] Created bucket "${minioBucket}"`);
  }

  try {
    await minioClient.setBucketPolicy(minioBucket, publicReadPolicy(minioBucket));
  } catch (error) {
    console.warn('[MinIO] Could not set public bucket policy:', error);
  }
}

export async function initMinio(): Promise<void> {
  const target = `${config.minio.endPoint}:${config.minio.port}`;
  try {
    await Promise.race([
      ensureBucket(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`timeout after ${MINIO_INIT_TIMEOUT_MS}ms`)),
          MINIO_INIT_TIMEOUT_MS
        )
      ),
    ]);
  } catch (error) {
    minioReady = false;
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      `[MinIO] Unavailable at ${target} (${reason}). Course/portfolio uploads will fail until MinIO is reachable.`
    );
    return;
  }

  minioReady = true;
  console.log(`[MinIO] Ready, bucket "${minioBucket}" at ${target}`);
}

export function rewritePublicStorageUrl(url: string): string {
  return url.replace(/^http:\/\/minio\.alexol\.io(?=\/|$)/i, 'https://minio.alexol.io');
}

export function getMinioPublicUrl(objectKey: string): string {
  if (config.minio.publicUrl) {
    return rewritePublicStorageUrl(`${config.minio.publicUrl}/${minioBucket}/${objectKey}`);
  }

  const protocol = config.minio.useSSL ? 'https' : 'http';
  const host = config.minio.endPoint;
  const port = config.minio.port;
  const needsPort = !(port === 80 && protocol === 'http') && !(port === 443 && protocol === 'https');
  const origin = needsPort ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
  return rewritePublicStorageUrl(`${origin}/${minioBucket}/${objectKey}`);
}
