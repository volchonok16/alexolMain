import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { minioClient, minioBucket, getMinioPublicUrl } from '../config/minio.js';

export async function uploadVideoToMinio(
  file: Express.Multer.File
): Promise<{ videoUrl: string; videoKey: string }> {
  const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
  const videoKey = `videos/${randomUUID()}${ext}`;

  await minioClient.fPutObject(minioBucket, videoKey, file.path, {
    'Content-Type': file.mimetype || 'video/mp4',
  });

  await removeTempFile(file.path);

  return {
    videoKey,
    videoUrl: getMinioPublicUrl(videoKey),
  };
}

export async function deleteVideoFromMinio(videoKey: string): Promise<void> {
  if (!videoKey) return;
  try {
    await minioClient.removeObject(minioBucket, videoKey);
  } catch (error) {
    console.error('[MinIO] Error deleting object:', error);
  }
}

export async function removeTempFile(filePath: string): Promise<void> {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Temp file may already be gone
  }
}
