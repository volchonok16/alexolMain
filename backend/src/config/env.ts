import dotenv from 'dotenv';

dotenv.config();

// Parse CORS_ORIGIN as array if it contains commas
const parseCorsOrigin = (origin: string | undefined): string[] => {
  const defaultOrigins = [
    'http://localhost:3000', // Swagger UI
    'http://localhost:5173', // Frontend dev
    'http://localhost:5174', // Admin dev
  ];
  
  if (!origin) return defaultOrigins;
  
  const customOrigins = origin.split(',').map(url => url.trim());
  // Merge custom origins with default localhost origins for development
  return [...new Set([...customOrigins, ...defaultOrigins])];
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
