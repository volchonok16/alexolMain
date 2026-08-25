import { seedPortfolio } from '../src/utils/seedPortfolio.js';
import { prisma } from '../src/config/database.js';
import { initMinio } from '../src/config/minio.js';

async function main() {
  await initMinio();
  await seedPortfolio();
}

main()
  .catch(error => {
    console.error('[Portfolio] Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
