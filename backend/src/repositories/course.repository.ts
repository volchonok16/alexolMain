import { prisma } from '../config/database.js';

export class CourseRepository {
  async create(data: { title: string; topic: string; description: string; videoUrl: string; videoKey: string }) {
    return prisma.course.create({ data });
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await prisma.$transaction([
      prisma.course.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          topic: true,
          description: true,
          videoUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.course.count(),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        topic: true,
        description: true,
        videoUrl: true,
        videoKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: string,
    data: { title?: string; topic?: string; description?: string; videoUrl?: string; videoKey?: string }
  ) {
    return prisma.course.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        topic: true,
        description: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.course.delete({ where: { id } });
  }
}
