import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const videoTmpDir = path.join('uploads', 'tmp');
if (!fs.existsSync(videoTmpDir)) {
  fs.mkdirSync(videoTmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Нужен файл JPG, PNG или WebP'));
    }
  }
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoTmpDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: config.minio.maxVideoSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /mp4|webm|mov|mkv|m4v/;
    const allowedMime = /video\/(mp4|webm|quicktime|x-matroska|x-m4v)|application\/octet-stream/;
    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMime.test(file.mimetype);

    if (extname && (mimetype || file.mimetype.startsWith('video/'))) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, webm, mov, mkv)'));
    }
  }
});
