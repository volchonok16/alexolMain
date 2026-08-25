import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { minioClient, minioBucket, getMinioPublicUrl } from '../config/minio.js';

function contentTypeFromExt(ext: string, fallback: string): string {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    default:
      return fallback;
  }
}

export async function uploadFileToMinio(
  file: Express.Multer.File,
  folder: string
): Promise<{ url: string; key: string }> {
  const ext = path.extname(file.originalname).toLowerCase() || '.bin';
  const key = `${folder}/${randomUUID()}${ext}`;

  await minioClient.fPutObject(minioBucket, key, file.path, {
    'Content-Type': file.mimetype || contentTypeFromExt(ext, 'application/octet-stream'),
  });

  await removeTempFile(file.path);

  return {
    key,
    url: getMinioPublicUrl(key),
  };
}

export async function uploadLocalPathToMinio(
  filePath: string,
  folder: string
): Promise<{ url: string; key: string }> {
  const ext = path.extname(filePath).toLowerCase() || '.png';
  const key = `${folder}/${randomUUID()}${ext}`;

  await minioClient.fPutObject(minioBucket, key, filePath, {
    'Content-Type': contentTypeFromExt(ext, 'image/png'),
  });

  return {
    key,
    url: getMinioPublicUrl(key),
  };
}

export async function uploadVideoToMinio(
  file: Express.Multer.File
): Promise<{ videoUrl: string; videoKey: string }> {
  const uploaded = await uploadFileToMinio(file, 'videos');
  return {
    videoKey: uploaded.key,
    videoUrl: uploaded.url,
  };
}

export async function deleteObjectFromMinio(objectKey: string): Promise<void> {
  if (!objectKey) return;
  try {
    await minioClient.removeObject(minioBucket, objectKey);
  } catch (error) {
    console.error('[MinIO] Error deleting object:', error);
  }
}

export const deleteVideoFromMinio = deleteObjectFromMinio;

export async function removeTempFile(filePath: string): Promise<void> {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Temp file may already be gone
  }
}
