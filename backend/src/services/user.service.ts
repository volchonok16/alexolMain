import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { saveFile, deleteFile } from '../utils/fileUpload.js';
import { normalizeLogin } from '../utils/login.js';
import { MailSyncService, toAbsolutePhotoUrl } from './mailSync.service.js';
import { config } from '../config/env.js';
import { normalizeOrgRoles, type OrgRoleId } from '../utils/orgRoles.js';

const parseBirthDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid birth date');
  return date;
};

const normalizeEmail = (email?: string | null) => {
  const value = email?.trim().toLowerCase();
  return value || null;
};

const normalizePhone = (phone?: string | null) => {
  const value = phone?.trim();
  return value || null;
};

const normalizeTelegram = (telegram?: string | null) => {
  const value = telegram?.trim();
  return value || null;
};

const normalizeJobTitle = (jobTitle?: string | null) => {
  const value = jobTitle?.trim();
  return value || null;
};

const normalizeDirection = (direction?: string | null) => {
  const value = direction?.trim();
  return value || null;
};

export class UserService {
  private userRepo = new UserRepository();
  private mailSync = new MailSyncService();

  async findById(id: string) {
    const user = await this.userRepo.findPublicById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async findAll(page: number = 1, limit: number = 20) {
    return this.userRepo.findAll(page, limit);
  }

  async create(data: {
    login: string;
    password: string;
    name: string;
    role: 'admin' | 'user';
    email?: string | null;
    phone?: string | null;
    jobTitle?: string | null;
    telegram?: string | null;
    birthDate?: string | null;
    orgRoles?: OrgRoleId[];
    direction?: string | null;
    isTechnical?: boolean;
    photo?: Express.Multer.File;
  }) {
    const login = normalizeLogin(data.login);
    const existing = await this.userRepo.findByLogin(login);
    if (existing) throw new Error('Login already exists');

    // Mailbox identity is always login@MAIL_DOMAIN (custom contact emails break mail login).
    const email = MailSyncService.mailboxEmail(login, config.mail.domain).toLowerCase();
    const contactEmail = normalizeEmail(data.email);
    if (contactEmail && contactEmail !== email) {
      const atDomain = `@${config.mail.domain}`.toLowerCase();
      if (contactEmail.endsWith(atDomain)) {
        throw new Error(
          `Почта на домене ${config.mail.domain} должна совпадать с логином: ${email}`
        );
      }
      // Non-domain "email" in the form is ignored for auth - mailbox stays login@domain.
    }

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) throw new Error('Email already exists');

    const phone = normalizePhone(data.phone);
    const jobTitle = normalizeJobTitle(data.jobTitle);
    const telegram = normalizeTelegram(data.telegram);
    const orgRoles = normalizeOrgRoles(data.orgRoles);
    const direction = normalizeDirection(data.direction);
    const isTechnical = Boolean(data.isTechnical);
    const photoUrl = data.photo ? await saveFile(data.photo) : null;
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const mailOk = await this.mailSync.ensureMailbox({
      username: login,
      full_name: data.name,
      password: data.password,
      is_admin: data.role === 'admin',
      is_active: true,
      phone,
      job_title: jobTitle,
      telegram,
      org_roles: orgRoles,
      direction,
      is_technical: isTechnical,
      avatar_url: toAbsolutePhotoUrl(photoUrl),
    });
    if (!mailOk) {
      if (photoUrl) await deleteFile(photoUrl);
      throw new Error(
        'Не удалось создать ящик на mail.alexol.io. Проверьте MAIL_API_URL, MAIL_SYNC_SECRET и контейнер mail_backend.'
      );
    }

    return this.userRepo.create({
      login,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      email,
      phone,
      jobTitle,
      telegram,
      orgRoles,
      direction,
      isTechnical,
      birthDate: parseBirthDate(data.birthDate),
      photo: photoUrl,
    });
  }

  async update(
    id: string,
    data: {
      login?: string;
      password?: string;
      name?: string;
      role?: 'admin' | 'user';
      email?: string | null;
      phone?: string | null;
      jobTitle?: string | null;
      telegram?: string | null;
      birthDate?: string | null;
      orgRoles?: OrgRoleId[];
      direction?: string | null;
      isTechnical?: boolean;
      photo?: Express.Multer.File;
    }
  ) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('User not found');

    const previousLogin = user.login.toLowerCase();

    if (data.login) {
      const login = normalizeLogin(data.login);
      if (login !== user.login.toLowerCase()) {
        const existing = await this.userRepo.findByLogin(login);
        if (existing) throw new Error('Login already exists');
      }
      data.login = login;
    }

    const nextLogin = (data.login || user.login).toLowerCase();
    const email = MailSyncService.mailboxEmail(nextLogin, config.mail.domain).toLowerCase();
    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail && existingEmail.id !== id) throw new Error('Email already exists');

    if (data.role === 'user' && user.role === 'admin') {
      const adminCount = await this.userRepo.countAdmins();
      if (adminCount <= 1) throw new Error('Cannot demote the last admin');
    }

    let photoUrl = user.photo;
    if (data.photo) {
      if (user.photo) await deleteFile(user.photo);
      photoUrl = await saveFile(data.photo);
    }

    const nextName = data.name ?? user.name;
    const nextIsAdmin = (data.role ?? user.role) === 'admin';
    const nextPhone =
      data.phone !== undefined ? normalizePhone(data.phone) : user.phone ?? null;
    const nextJobTitle =
      data.jobTitle !== undefined ? normalizeJobTitle(data.jobTitle) : user.jobTitle ?? null;
    const nextTelegram =
      data.telegram !== undefined ? normalizeTelegram(data.telegram) : user.telegram ?? null;
    const nextOrgRoles =
      data.orgRoles !== undefined ? normalizeOrgRoles(data.orgRoles) : normalizeOrgRoles(user.orgRoles);
    const nextDirection =
      data.direction !== undefined ? normalizeDirection(data.direction) : user.direction ?? null;
    const nextIsTechnical =
      data.isTechnical !== undefined ? Boolean(data.isTechnical) : Boolean(user.isTechnical);

    const updated = await this.userRepo.update(id, {
      login: data.login,
      name: data.name,
      role: data.role,
      email,
      phone: data.phone !== undefined ? nextPhone : undefined,
      jobTitle: data.jobTitle !== undefined ? nextJobTitle : undefined,
      telegram: data.telegram !== undefined ? nextTelegram : undefined,
      orgRoles: data.orgRoles !== undefined ? nextOrgRoles : undefined,
      direction: data.direction !== undefined ? nextDirection : undefined,
      isTechnical: data.isTechnical !== undefined ? nextIsTechnical : undefined,
      birthDate: data.birthDate === undefined ? undefined : parseBirthDate(data.birthDate),
      photo: photoUrl,
      ...(data.password ? { password: await bcrypt.hash(data.password, 10) } : {}),
    });

    const mailOk = await this.mailSync.updateMailbox(previousLogin, {
      full_name: nextName,
      password: data.password,
      is_admin: nextIsAdmin,
      is_active: true,
      phone: nextPhone,
      job_title: nextJobTitle,
      telegram: nextTelegram,
      org_roles: nextOrgRoles,
      direction: nextDirection,
      is_technical: nextIsTechnical,
      avatar_url: toAbsolutePhotoUrl(photoUrl),
      new_username: data.login && data.login !== previousLogin ? data.login : undefined,
    });
    if (!mailOk && !data.photo) {
      throw new Error(
        'Ящик на mail не найден или sync не удался. Задайте пароль ещё раз и сохраните - так ящик создастся/обновится. Проверьте также MAIL_SYNC_SECRET.'
      );
    }
    if (!mailOk) {
      console.warn('[users] photo saved in admin, mail sync failed for', nextLogin);
    }
    return updated;
  }

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) throw new Error('Cannot delete your own account');

    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('User not found');

    if (user.role === 'admin') {
      const adminCount = await this.userRepo.countAdmins();
      if (adminCount <= 1) throw new Error('Cannot delete the last admin');
    }

    const login = user.login.toLowerCase();
    // Remote first - both sides stay in sync; abort if mail delete fails.
    const mailOk = await this.mailSync.deleteMailbox(login);
    if (!mailOk) {
      throw new Error(
        'Не удалось удалить ящик на mail.alexol.io. Пользователь в админке не удалён. Проверьте MAIL_API_URL / MAIL_SYNC_SECRET.'
      );
    }

    if (user.photo) await deleteFile(user.photo);
    return this.userRepo.delete(id);
  }
}
