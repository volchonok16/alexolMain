import { prisma } from '../config/database.js';

export class NewsRepository {
  async create(data: { title: string; text: string; photo: string }) {
    return prisma.news.create({ data });
  }

  async findAll() {
    return prisma.news.findMany({ orderBy: { creationDate: 'desc' } });
  }

  async findById(id: string) {
    return prisma.news.findUnique({ where: { id } });
  }

  async update(id: string, data: { title?: string; text?: string; photo?: string }) {
    return prisma.news.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.news.delete({ where: { id } });
  }
}
