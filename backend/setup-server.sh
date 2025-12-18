#!/bin/bash

# Скрипт для первоначальной настройки бэкенда на сервере

echo "🚀 Настройка бэкенда Alexol.io"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Создание директории для uploads
mkdir -p uploads
echo "✅ Создана папка uploads"

# Создание .env если не существует
if [ ! -f .env ]; then
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Создан файл .env из env.example"
        echo "⚠️  ВАЖНО: Отредактируйте .env и укажите безопасные пароли!"
        echo "   nano .env"
    else
        echo "❌ Файл env.example не найден"
        exit 1
    fi
else
    echo "✅ Файл .env уже существует"
fi

# Запуск Docker Compose
echo "🐳 Запуск Docker Compose..."
docker-compose up -d --build

# Ожидание запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "📝 Полезные команды:"
echo "   docker-compose logs -f backend    # Просмотр логов"
echo "   docker-compose ps                 # Статус контейнеров"
echo "   docker-compose down               # Остановка"
echo "   docker-compose restart            # Перезапуск"
echo ""
echo "🌐 API доступен на порту 8547"
echo "🗄️  PostgreSQL доступен на порту 7432"

