import { prisma } from '../config/database.js';
import { dumpOrgRoles, normalizeOrgRoles, type OrgRoleId } from '../utils/orgRoles.js';

type UserCreateData = {
  login: string;
  password: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  telegram?: string | null;
  photo?: string | null;
  birthDate?: Date | null;
  orgRoles?: string[] | null;
  direction?: string | null;
  isTechnical?: boolean;
};

type UserUpdateData = {
  login?: string;
  password?: string;
  name?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  telegram?: string | null;
  photo?: string | null;
  birthDate?: Date | null;
  orgRoles?: string[] | null;
  direction?: string | null;
  isTechnical?: boolean;
};

export type PublicUser = {
  id: string;
  login: string;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  telegram: string | null;
  role: string;
  photo: string | null;
  birthDate: Date | null;
  orgRoles: OrgRoleId[];
  direction: string | null;
  isTechnical: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const publicSelect = {
  id: true,
  login: true,
  name: true,
  email: true,
  phone: true,
  jobTitle: true,
  telegram: true,
  role: true,
  photo: true,
  birthDate: true,
  orgRoles: true,
  direction: true,
  isTechnical: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toPublicUser = (row: {
  id: string;
  login: string;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  telegram: string | null;
  role: string;
  photo: string | null;
  birthDate: Date | null;
  orgRoles: string | null;
  direction: string | null;
  isTechnical: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PublicUser => ({
  ...row,
  orgRoles: normalizeOrgRoles(row.orgRoles),
  direction: (row.direction || '').trim() || null,
  isTechnical: Boolean(row.isTechnical),
});

const toStoredOrgRoles = (value: string[] | null | undefined) =>
  value === undefined ? undefined : dumpOrgRoles(value);

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
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicSelect,
    });
    return user ? toPublicUser(user) : null;
  }

  async countAdmins() {
    return prisma.user.count({ where: { role: 'admin' } });
  }

  async create(data: UserCreateData) {
    const { orgRoles, ...rest } = data;
    const user = await prisma.user.create({
      data: {
        ...rest,
        orgRoles: dumpOrgRoles(orgRoles),
        isTechnical: Boolean(data.isTechnical),
      },
      select: publicSelect,
    });
    return toPublicUser(user);
  }

  async update(id: string, data: UserUpdateData) {
    const { orgRoles, ...rest } = data;
    const storedOrgRoles = toStoredOrgRoles(orgRoles);
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(storedOrgRoles !== undefined ? { orgRoles: storedOrgRoles } : {}),
      },
      select: publicSelect,
    });
    return toPublicUser(user);
  }

  async delete(id: string) {
    const user = await prisma.user.delete({
      where: { id },
      select: publicSelect,
    });
    return toPublicUser(user);
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
      prisma.user.count(),
    ]);

    return {
      users: users.map(toPublicUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
