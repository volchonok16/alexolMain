import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { saveFile, deleteFile } from '../utils/fileUpload.js';
import { normalizeLogin } from '../utils/login.js';
import { MailSyncService } from './mailSync.service.js';
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
    birthDate?: string | null;
    photo?: Express.Multer.File;
  }) {
    const login = normalizeLogin(data.login);
    const existing = await this.userRepo.findByLogin(login);
    if (existing) throw new Error('Login already exists');

    // Prefer explicit email; otherwise assign mailbox login@MAIL_DOMAIN
    let email = normalizeEmail(data.email);
    if (!email) {
      email = MailSyncService.mailboxEmail(login, config.mail.domain).toLowerCase();
    }

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) throw new Error('Email already exists');

    const photoUrl = data.photo ? await saveFile(data.photo) : null;
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userRepo.create({
      login,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      email,
      birthDate: parseBirthDate(data.birthDate),
      photo: photoUrl,
    });

    await this.mailSync.createMailbox({
      username: login,
      full_name: data.name,
      password: data.password,
      is_admin: data.role === 'admin',
      is_active: true,
    });

    return user;
  }

  async update(
    id: string,
    data: {
      login?: string;
      password?: string;
      name?: string;
      role?: 'admin' | 'user';
      email?: string | null;
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

    const email = data.email === undefined ? undefined : normalizeEmail(data.email);
    if (email) {
      const existingEmail = await this.userRepo.findByEmail(email);
      if (existingEmail && existingEmail.id !== id) throw new Error('Email already exists');
    }

    if (data.role === 'user' && user.role === 'admin') {
      const adminCount = await this.userRepo.countAdmins();
      if (adminCount <= 1) throw new Error('Cannot demote the last admin');
    }

    let photoUrl = user.photo;
    if (data.photo) {
      if (user.photo) await deleteFile(user.photo);
      photoUrl = await saveFile(data.photo);
    }

    const updated = await this.userRepo.update(id, {
      login: data.login,
      name: data.name,
      role: data.role,
      email,
      birthDate: data.birthDate === undefined ? undefined : parseBirthDate(data.birthDate),
      photo: photoUrl,
      ...(data.password ? { password: await bcrypt.hash(data.password, 10) } : {}),
    });

    const nextLogin = (data.login || previousLogin).toLowerCase();
    const syncPayload: {
      full_name?: string;
      password?: string;
      is_admin?: boolean;
      new_username?: string;
    } = {
      full_name: data.name ?? user.name,
      is_admin: (data.role ?? user.role) === 'admin',
    };
    if (data.password) syncPayload.password = data.password;
    if (data.login && data.login !== previousLogin) syncPayload.new_username = data.login;

    // Always ensure mailbox stays in sync (create if missing; set password when provided).
    if (data.password || data.name !== undefined || data.role !== undefined || data.login) {
      await this.mailSync.updateMailbox(previousLogin, syncPayload);
    } else {
      await this.mailSync.ensureMailbox({
        username: nextLogin,
        full_name: user.name,
        is_admin: user.role === 'admin',
        is_active: true,
      });
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

    if (user.photo) await deleteFile(user.photo);
    const deleted = await this.userRepo.delete(id);

    await this.mailSync.deleteMailbox(user.login.toLowerCase());

    return deleted;
  }
}
