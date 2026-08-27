import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = 'uploads';

export async function saveFile(file: Express.Multer.File): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  return `/uploads/${file.filename}`;
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (!filePath || /^https?:\/\//i.test(filePath)) return;
    const fullPath = path.join(process.cwd(), filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

/** Save image from base64 payload into uploads/, return public path `/uploads/...`. */
export async function savePhotoFromBase64(
  base64: string,
  contentType = 'image/jpeg'
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext =
    contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  const buf = Buffer.from(base64, 'base64');
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buf);
  return `/uploads/${filename}`;
}

/** Download remote image and store locally. */
export async function savePhotoFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const ext =
      contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buf);
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[photo] download failed', url, err);
    return null;
  }
}
