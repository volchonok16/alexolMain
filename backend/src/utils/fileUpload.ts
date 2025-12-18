import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = 'uploads';

export async function saveFile(file: Express.Multer.File): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  return `/uploads/${file.filename}`;
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}
