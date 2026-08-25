import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.js';

const publicApiUrl =
  process.env.PUBLIC_API_URL ||
  process.env.API_URL ||
  (config.nodeEnv === 'production' ? 'https://api.alexol.io' : `http://localhost:${config.port}`);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      version: '1.0.0',
      description: 'API для управления пользователями, новостями и курсами',
    },
    servers: [
      {
        url: publicApiUrl,
        description: 'API server',
      },
      // Keep localhost option for local testing from Swagger UI.
      ...(config.nodeEnv === 'production'
        ? [{ url: `http://localhost:${config.port}`, description: 'Local (on server) development' }]
        : []),
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
