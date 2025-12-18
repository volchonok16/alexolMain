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

const app = express();

app.use(helmet());
app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:5174', 'http://localhost:3000', 'http://192.168.0.45:5173'],
  credentials: true
}));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/news', newsRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
});
