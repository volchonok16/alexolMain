import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';

/**
 * Автоматическая инициализация админа при первом запуске
 */
export async function initAdmin() {
  try {
    // Проверяем, есть ли хоть один пользователь в базе
    const usersCount = await prisma.user.count();
    
    if (usersCount === 0) {
      // Если пользователей нет, создаём дефолтного админа
      const login = 'alex';
      const password = 'Triu546r!)';
      const name = 'Alex Administrator';
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const admin = await prisma.user.create({
        data: {
          login,
          password: hashedPassword,
          name,
          role: 'admin',
        },
      });
      
      console.log('✅ Default admin created successfully:');
      console.log(`   Login: ${login}`);
      console.log(`   ID: ${admin.id}`);
      console.log('   ⚠️  Change the password after first login!');
    } else {
      console.log('ℹ️  Users already exist in database, skipping admin creation');
    }
  } catch (error) {
    console.error('❌ Error initializing admin:', error);
    // Не выбрасываем ошибку, чтобы не прерывать запуск сервера
  }
}
