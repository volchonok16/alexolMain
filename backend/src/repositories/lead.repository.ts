import { prisma } from '../config/database.js';

export type LeadCreateData = {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  budget?: string;
  description: string;
  pageCount?: number;
  calculatedPrice?: number;
  source?: string;
};

export type LeadUpdateData = {
  status?: string;
};

export class LeadRepository {
  async create(data: LeadCreateData) {
    return prisma.lead.create({ data });
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await prisma.$transaction([
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count(),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.lead.findUnique({ where: { id } });
  }

  async update(id: string, data: LeadUpdateData) {
    return prisma.lead.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  }
}
