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

export async function initMinio(): Promise<void> {
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

  console.log(`[MinIO] Ready, bucket "${minioBucket}"`);
}

export function getMinioPublicUrl(objectKey: string): string {
  if (config.minio.publicUrl) {
    return `${config.minio.publicUrl}/${minioBucket}/${objectKey}`;
  }

  const protocol = config.minio.useSSL ? 'https' : 'http';
  const host = config.minio.endPoint;
  const port = config.minio.port;
  const needsPort = !(port === 80 && protocol === 'http') && !(port === 443 && protocol === 'https');
  const origin = needsPort ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
  return `${origin}/${minioBucket}/${objectKey}`;
}
