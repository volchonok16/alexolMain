import { prisma } from '../config/database.js';

type UserCreateData = {
  login: string;
  password: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  birthDate?: Date | null;
};

type UserUpdateData = {
  login?: string;
  password?: string;
  name?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  birthDate?: Date | null;
};

const publicSelect = {
  id: true,
  login: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  photo: true,
  birthDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByLogin(login: string) {
    return prisma.user.findFirst({
      where: {
        login: {
          equals: login.trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  async findPublicById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: publicSelect,
    });
  }

  async countAdmins() {
    return prisma.user.count({ where: { role: 'admin' } });
  }

  async create(data: UserCreateData) {
    return prisma.user.create({
      data,
      select: publicSelect,
    });
  }

  async update(id: string, data: UserUpdateData) {
    return prisma.user.update({
      where: { id },
      data,
      select: publicSelect,
    });
  }

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
      select: publicSelect,
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: publicSelect,
      }),
      prisma.user.count()
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
