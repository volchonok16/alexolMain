import { prisma } from '../config/database.js';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByLogin(login: string) {
    return prisma.user.findUnique({ where: { login } });
  }

  async findAll() {
    return prisma.user.findMany();
  }
}
