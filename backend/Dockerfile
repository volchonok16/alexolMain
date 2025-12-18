FROM node:20-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
RUN npm run build

# Удаляем devDependencies после сборки
RUN npm prune --production

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

