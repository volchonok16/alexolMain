import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { saveFile, deleteFile } from '../utils/fileUpload.js';
import { normalizeLogin } from '../utils/login.js';
import { MailSyncService, toAbsolutePhotoUrl } from './mailSync.service.js';
import { config } from '../config/env.js';

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
    telegram?: string | null;
    birthDate?: string | null;
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
    const telegram = normalizeTelegram(data.telegram);
    const photoUrl = data.photo ? await saveFile(data.photo) : null;
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const mailOk = await this.mailSync.ensureMailbox({
      username: login,
      full_name: data.name,
      password: data.password,
      is_admin: data.role === 'admin',
      is_active: true,
      phone,
      telegram,
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
      telegram,
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
      telegram?: string | null;
      birthDate?: string | null;
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
    const nextTelegram =
      data.telegram !== undefined ? normalizeTelegram(data.telegram) : user.telegram ?? null;

    const mailOk = await this.mailSync.updateMailbox(previousLogin, {
      full_name: nextName,
      password: data.password,
      is_admin: nextIsAdmin,
      is_active: true,
      phone: nextPhone,
      telegram: nextTelegram,
      avatar_url: toAbsolutePhotoUrl(photoUrl),
      new_username: data.login && data.login !== previousLogin ? data.login : undefined,
    });
    if (!mailOk) {
      throw new Error(
        'Ящик на mail не найден или sync не удался. Задайте пароль ещё раз и сохраните - так ящик создастся/обновится. Проверьте также MAIL_SYNC_SECRET.'
      );
    }

    return this.userRepo.update(id, {
      login: data.login,
      name: data.name,
      role: data.role,
      email,
      phone: data.phone !== undefined ? nextPhone : undefined,
      telegram: data.telegram !== undefined ? nextTelegram : undefined,
      birthDate: data.birthDate === undefined ? undefined : parseBirthDate(data.birthDate),
      photo: photoUrl,
      ...(data.password ? { password: await bcrypt.hash(data.password, 10) } : {}),
    });
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
