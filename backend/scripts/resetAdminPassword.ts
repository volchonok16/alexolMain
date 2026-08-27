import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const login = (process.argv[2] || 'alex').trim().toLowerCase();
  const password = process.argv[3];

  if (!password) {
    console.error('Usage: npx tsx scripts/resetAdminPassword.ts [login] <new-password>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { login } });
  if (!user) {
    console.error(`Admin user "${login}" not found`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  console.log(`✅ Password updated for admin "${login}"`);
  console.log('   Sync BACKEND_ADMIN_PASSWORD in backend/.env and restart bot_news.');
  await prisma.$disconnect();
}

resetAdminPassword().catch((error) => {
  console.error(error);
  process.exit(1);
});
