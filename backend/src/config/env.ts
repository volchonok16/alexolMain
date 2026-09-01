import dotenv from 'dotenv';
import { existsSync } from 'fs';

dotenv.config();

// Parse CORS_ORIGIN as array if it contains commas
const parseCorsOrigin = (origin: string | undefined): string[] => {
  const localhostOrigins = [
    'http://localhost:3000', // Swagger UI
    'http://localhost:5173', // Frontend dev
    'http://localhost:5174', // Admin dev
  ];
  
  const productionOrigins = [
    'https://alexol.io',
    'https://admin.alexol.io',
    'https://mail.alexol.io',
  ];
  
  if (!origin) {
    // If no CORS_ORIGIN is set, include both localhost and production
    console.warn('[CORS] No CORS_ORIGIN env variable set, using defaults');
    return [...localhostOrigins, ...productionOrigins];
  }
  
  const customOrigins = origin.split(',').map(url => url.trim()).filter(url => url);
  
  // In development, merge with localhost origins
  if (process.env.NODE_ENV === 'development') {
    return [...new Set([...customOrigins, ...localhostOrigins])];
  }
  
  // In production, use only custom origins (or production defaults if custom is empty)
  return customOrigins.length > 0 ? customOrigins : productionOrigins;
};

const parseCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value?.trim()) return fallback;
  const items = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

const runningInDocker = (): boolean => existsSync('/.dockerenv');

const parseMinioEndpoint = (value: string | undefined): string => {
  const cleaned = (value || 'localhost').replace(/^https?:\/\//, '');
  const dockerAliases = new Set(['localhost', '127.0.0.1', 'host.docker.internal']);
  if (runningInDocker() && dockerAliases.has(cleaned)) {
    console.warn(`[MinIO] ${cleaned} is not reachable from Docker; using service name "minio"`);
    return 'minio';
  }
  return cleaned;
};

/** Mail API is published on host as 127.0.0.1:17000 - unreachable via host.docker.internal. */
const parseMailApiUrl = (value: string | undefined): string => {
  const cleaned = (value || '').replace(/\/$/, '');
  if (!cleaned || !runningInDocker()) return cleaned;

  try {
    const url = new URL(cleaned);
    const dockerAliases = new Set(['localhost', '127.0.0.1', 'host.docker.internal']);
    if (dockerAliases.has(url.hostname)) {
      console.warn(
        `[mail-sync] ${url.hostname} is not reachable from Docker; using http://mail_backend:8000`
      );
      return 'http://mail_backend:8000';
    }
  } catch {
    // keep original
  }
  return cleaned;
};

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: parseCorsOrigin(process.env.CORS_ORIGIN),
  publicApiUrl: process.env.PUBLIC_API_URL,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
  telegramNewsBotToken: process.env.TELEGRAM_NEWS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN!,
  telegramChatId: process.env.TELEGRAM_CHAT_ID!,
  minio: {
    endPoint: parseMinioEndpoint(process.env.MINIO_ENDPOINT),
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: parseBoolean(process.env.MINIO_USE_SSL, false),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'courses',
    publicUrl: (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, ''),
    maxVideoSizeMb: parseInt(process.env.MINIO_MAX_VIDEO_SIZE_MB || '10240'),
  },
  mail: {
    /** Base URL of mail API (e.g. http://mail_backend:8000 or https://mail.alexol.io) */
    apiUrl: parseMailApiUrl(process.env.MAIL_API_URL),
    syncSecret: process.env.MAIL_SYNC_SECRET || '',
    domain: process.env.MAIL_DOMAIN || 'alexol.io',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    fallbackModels: parseCsv(
      process.env.OPENROUTER_FALLBACK_MODELS,
      [
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        'poolside/laguna-xs.2:free',
        'openrouter/free',
        'qwen/qwen3.6-plus:free',
        'nvidia/nemotron-3-nano-30b-a3b:free',
        'google/gemma-3-27b-it:free',
        'meta-llama/llama-3.3-70b-instruct:free',
      ]
    ),
    httpProxy: (
      process.env.OPENROUTER_HTTP_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy ||
      ''
    ).trim(),
    timeoutMs: Number.isFinite(parseInt(process.env.OPENROUTER_TIMEOUT_MS || '', 10))
      ? parseInt(process.env.OPENROUTER_TIMEOUT_MS || '180000', 10)
      : 180000,
    perModelTimeoutMs: Number.isFinite(parseInt(process.env.OPENROUTER_PER_MODEL_TIMEOUT_MS || '', 10))
      ? parseInt(process.env.OPENROUTER_PER_MODEL_TIMEOUT_MS || '90000', 10)
      : 90000,
  },
};
