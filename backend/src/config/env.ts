import dotenv from 'dotenv';

dotenv.config();

// Parse CORS_ORIGIN as array if it contains commas
const parseCorsOrigin = (origin: string | undefined): string[] => {
  if (!origin) return ['http://localhost:5173'];
  return origin.split(',').map(url => url.trim());
};

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: parseCorsOrigin(process.env.CORS_ORIGIN),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
  telegramChatId: process.env.TELEGRAM_CHAT_ID!,
};
