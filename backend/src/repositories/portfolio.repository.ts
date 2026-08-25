import { prisma } from '../config/database.js';

const publicSelect = {
  id: true,
  category: true,
  titleRu: true,
  titleEn: true,
  descriptionRu: true,
  descriptionEn: true,
  resultRu: true,
  resultEn: true,
  link: true,
  imageUrl: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PortfolioCreateData = {
  category: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  resultRu: string;
  resultEn: string;
  link?: string | null;
  imageUrl: string;
  imageKey: string;
  sortOrder: number;
};

export type PortfolioUpdateData = Partial<Omit<PortfolioCreateData, 'imageUrl' | 'imageKey'>> & {
  imageUrl?: string;
  imageKey?: string;
};

export class PortfolioRepository {
  async create(data: PortfolioCreateData) {
    return prisma.portfolioItem.create({ data, select: publicSelect });
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await prisma.$transaction([
      prisma.portfolioItem.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: publicSelect,
      }),
      prisma.portfolioItem.count(),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.portfolioItem.findUnique({
      where: { id },
      select: {
        ...publicSelect,
        imageKey: true,
      },
    });
  }

  async update(id: string, data: PortfolioUpdateData) {
    return prisma.portfolioItem.update({
      where: { id },
      data,
      select: publicSelect,
    });
  }

  async delete(id: string) {
    return prisma.portfolioItem.delete({ where: { id } });
  }

  async count() {
    return prisma.portfolioItem.count();
  }

  async getMaxSortOrder() {
    const result = await prisma.portfolioItem.aggregate({
      _max: { sortOrder: true },
    });
    return result._max.sortOrder ?? 0;
  }
}
