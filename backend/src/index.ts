import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { newsRouter } from './routes/news.routes.js';
import { courseRouter } from './routes/course.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import { leadRouter } from './routes/lead.routes.js';
import { portfolioRouter } from './routes/portfolio.routes.js';
import { initAdmin } from './utils/initAdmin.js';
import { seedPortfolio } from './utils/seedPortfolio.js';
import { initMinio } from './config/minio.js';

const app = express();

app.use(helmet());

// CORS configuration - must be before other middleware
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, Swagger UI)
    if (!origin) return callback(null, true);
    
    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Explicitly handle preflight to avoid falling into errorHandler.
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(cookieParser());
// Static files (uploads) need CORS too - use wildcard for images (no credentials)
app.use('/uploads', cors({ origin: '*' }), express.static('uploads'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/news', newsRouter);
app.use('/api/courses', courseRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/contact', contactRouter);
app.use('/api/leads', leadRouter);

app.use(errorHandler);

// Запуск сервера с автоматической инициализацией админа
app.listen(config.port, async () => {
  console.log(`🚀 Server running on port ${config.port}`);
  
  // Инициализация админа при первом запуске
  await initAdmin();

  await initMinio();

  try {
    await seedPortfolio();
  } catch (error) {
    console.error('[Portfolio] Seed failed:', error);
  }
});
