import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../config/database.js';
import { isMinioReady } from '../config/minio.js';
import { deleteObjectFromMinio, uploadLocalPathToMinio } from './minioStorage.js';

const ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../seeds/portfolio'
);

const SEED_ITEMS = [
  {
    category: 'Crypto',
    titleRu: 'Portal to Bitcoin',
    titleEn: 'Portal to Bitcoin',
    descriptionRu: 'Промо-платформа для BonusBlock',
    descriptionEn: 'Promo platform for BonusBlock',
    resultRu: 'Quests & Rewards система',
    resultEn: 'Quests & Rewards system',
    link: 'https://quests.portaltobitcoin.com/',
    imageFile: 'project1.png',
    sortOrder: 1,
  },
  {
    category: 'Crypto',
    titleRu: 'Elys Network',
    titleEn: 'Elys Network',
    descriptionRu: 'Промо-платформа для BonusBlock',
    descriptionEn: 'Promo platform for BonusBlock',
    resultRu: 'DeFi проект',
    resultEn: 'DeFi project',
    link: 'https://elys.bonusblock.io/',
    imageFile: 'project2.png',
    sortOrder: 2,
  },
  {
    category: 'Crypto',
    titleRu: 'Xion',
    titleEn: 'Xion',
    descriptionRu: 'Промо-платформа для BonusBlock',
    descriptionEn: 'Promo platform for BonusBlock',
    resultRu: 'Web3 инфраструктура',
    resultEn: 'Web3 infrastructure',
    link: 'https://xion.bonusblock.io/',
    imageFile: 'project3.png',
    sortOrder: 3,
  },
  {
    category: 'eCommerce',
    titleRu: 'OneWish — женское бельё',
    titleEn: 'OneWish — Lingerie',
    descriptionRu: 'onewish.ru — интернет-магазин с админ-панелью',
    descriptionEn: 'onewish.ru — online store with admin panel',
    resultRu: 'Полный цикл: каталог, корзина, CMS',
    resultEn: 'Full cycle: catalog, cart, CMS',
    link: 'https://onewish.ru/',
    imageFile: 'onewish.png',
    sortOrder: 4,
  },
  {
    category: 'eCommerce',
    titleRu: 'Интернет-магазин спецодежды',
    titleEn: 'Workwear Online Store',
    descriptionRu: 'voenasledie.ru — магазин камуфляжа и тактической одежды',
    descriptionEn: 'voenasledie.ru — camouflage and tactical clothing store',
    resultRu: 'Каталог, корзина, оплата',
    resultEn: 'Catalog, cart, payment',
    link: 'https://voenasledie.ru/',
    imageFile: 'voenasledie.png',
    sortOrder: 5,
  },
  {
    category: 'Enterprise',
    titleRu: 'ПО для компьютерного клуба',
    titleEn: 'Computer Club Software',
    descriptionRu: 'tapf.ru — система управления компьютерным клубом',
    descriptionEn: 'tapf.ru — computer club management system',
    resultRu: 'Бронирование, тарифы, аналитика',
    resultEn: 'Booking, tariffs, analytics',
    link: 'https://tapf.ru/',
    imageFile: 'gameClub.png',
    sortOrder: 6,
  },
  {
    category: 'Crypto',
    titleRu: 'BonusBlock',
    titleEn: 'BonusBlock',
    descriptionRu: 'Основная платформа',
    descriptionEn: 'Main platform',
    resultRu: '15+ интегрированных проектов',
    resultEn: '15+ integrated projects',
    link: 'https://app.bonusblock.io/',
    imageFile: 'project4.png',
    sortOrder: 7,
  },
  {
    category: 'Crypto',
    titleRu: 'KiteAi',
    titleEn: 'KiteAi',
    descriptionRu: 'AI-платформа testnet',
    descriptionEn: 'AI platform testnet',
    resultRu: 'AI + Blockchain интеграция',
    resultEn: 'AI + Blockchain integration',
    link: 'https://testnet.gokite.ai/',
    imageFile: 'project5.png',
    sortOrder: 8,
  },
  {
    category: 'Crypto',
    titleRu: 'Agoric',
    titleEn: 'Agoric',
    descriptionRu: 'Промо-платформа для BonusBlock',
    descriptionEn: 'Promo platform for BonusBlock',
    resultRu: 'Smart Contracts платформа',
    resultEn: 'Smart Contracts platform',
    link: 'https://agoric.bonusblock.io/',
    imageFile: 'project6.png',
    sortOrder: 9,
  },
  {
    category: 'Automation',
    titleRu: 'Telegram-бот парсер авто',
    titleEn: 'Telegram Car Parser Bot',
    descriptionRu: 'Парсинг объявлений с зарубежных сайтов',
    descriptionEn: 'Parsing ads from foreign websites',
    resultRu: 'Автоматический мониторинг и уведомления',
    resultEn: 'Automatic monitoring and notifications',
    link: undefined,
    imageFile: 'autoParse.png',
    sortOrder: 10,
  },
] as const;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function seedPortfolio(): Promise<void> {
  const existing = await prisma.portfolioItem.count();
  if (existing > 0) {
    console.log('ℹ️  Portfolio items already exist, skipping seed');
    return;
  }

  if (!isMinioReady()) {
    console.warn('[Portfolio] Skipping seed: MinIO is not available');
    return;
  }

  console.log('[Portfolio] Seeding current works into the database...');

  const uploaded: Array<(typeof SEED_ITEMS)[number] & { imageUrl: string; imageKey: string }> = [];

  try {
    for (const item of SEED_ITEMS) {
      const imagePath = path.join(ASSETS_DIR, item.imageFile);
      if (!(await fileExists(imagePath))) {
        throw new Error(`Image not found for "${item.titleEn}": ${imagePath}`);
      }

      const file = await uploadLocalPathToMinio(imagePath, 'portfolio');
      uploaded.push({ ...item, imageUrl: file.url, imageKey: file.key });
    }

    await prisma.$transaction(
      uploaded.map(item =>
        prisma.portfolioItem.create({
          data: {
            category: item.category,
            titleRu: item.titleRu,
            titleEn: item.titleEn,
            descriptionRu: item.descriptionRu,
            descriptionEn: item.descriptionEn,
            resultRu: item.resultRu,
            resultEn: item.resultEn,
            link: item.link,
            imageUrl: item.imageUrl,
            imageKey: item.imageKey,
            sortOrder: item.sortOrder,
          },
        })
      )
    );

    console.log(`[Portfolio] Seeded ${uploaded.length} items`);
  } catch (error) {
    await Promise.all(uploaded.map(item => deleteObjectFromMinio(item.imageKey)));
    throw error;
  }
}
