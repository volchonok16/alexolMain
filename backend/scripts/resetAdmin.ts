import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAdmin() {
  await prisma.user.deleteMany();
  console.log('🗑️  Deleted all users');

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

  console.log('✅ Admin created:');
  console.log('   Login:', login);
  console.log('   Password:', password);
  console.log('   ID:', user.id);
  
  await prisma.$disconnect();
}

resetAdmin().catch(console.error);
