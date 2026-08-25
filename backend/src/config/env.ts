import dotenv from 'dotenv';

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

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
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
  telegramChatId: process.env.TELEGRAM_CHAT_ID!,
  minio: {
    endPoint: (process.env.MINIO_ENDPOINT || 'localhost').replace(/^https?:\/\//, ''),
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: parseBoolean(process.env.MINIO_USE_SSL, false),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'courses',
    publicUrl: (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, ''),
    maxVideoSizeMb: parseInt(process.env.MINIO_MAX_VIDEO_SIZE_MB || '10240'),
  },
};
