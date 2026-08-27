import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { normalizeLogin } from '../utils/login.js';
import { MailSyncService } from './mailSync.service.js';
import { config } from '../config/env.js';

type MailInboundPayload = {
  username: string;
  full_name: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
};

/**
 * Inbound sync: mail.alexol.io → admin DB.
 * Must NOT call MailSyncService (would loop).
 */
export class MailInboundSyncService {
  private userRepo = new UserRepository();

  async ensureFromMail(payload: MailInboundPayload) {
    const login = normalizeLogin(payload.username);
    if (!login) throw new Error('username is required');

    const email = MailSyncService.mailboxEmail(login, config.mail.domain).toLowerCase();
    const role = payload.is_admin ? 'admin' : 'user';
    const name = (payload.full_name || login).trim() || login;

    const existing = await this.userRepo.findByLogin(login);
    if (existing) {
      const data: {
        name?: string;
        role?: string;
        email?: string | null;
        password?: string;
      } = {
        name,
        role,
        email,
      };
      if (payload.password) {
        data.password = await bcrypt.hash(payload.password, 10);
      }
      return this.userRepo.update(existing.id, data);
    }

    if (!payload.password) {
      throw new Error('password is required to create admin user from mail');
    }

    const emailOwner = await this.userRepo.findByEmail(email);
    if (emailOwner) throw new Error('Email already exists');

    return this.userRepo.create({
      login,
      password: await bcrypt.hash(payload.password, 10),
      name,
      role,
      email,
    });
  }

  async deleteFromMail(username: string) {
    const login = normalizeLogin(username);
    const user = await this.userRepo.findByLogin(login);
    if (!user) return { deleted: false };

    if (user.role === 'admin') {
      const adminCount = await this.userRepo.countAdmins();
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin');
      }
    }

    await this.userRepo.delete(user.id);
    return { deleted: true };
  }
}
