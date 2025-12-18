import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  const login = 'admin';
  const password = 'admin123';
  const name = 'Administrator';

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      login,
      password: hashedPassword,
      name,
      role: 'admin',
    },
  });

  console.log('✅ Admin created:', { login, password, id: user.id });
  await prisma.$disconnect();
}

createAdmin().catch(console.error);
