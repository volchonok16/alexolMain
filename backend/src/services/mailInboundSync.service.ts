import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { normalizeLogin } from '../utils/login.js';
import { MailSyncService } from './mailSync.service.js';
import { config } from '../config/env.js';
import { deleteFile, savePhotoFromBase64, savePhotoFromUrl } from '../utils/fileUpload.js';

type MailInboundPayload = {
  username: string;
  full_name: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
  phone?: string | null;
  job_title?: string | null;
  telegram?: string | null;
  avatar_url?: string | null;
  avatar_base64?: string | null;
  avatar_content_type?: string | null;
};

/**
 * Inbound sync: mail.alexol.io → admin DB.
 * Must NOT call MailSyncService (would loop).
 */
export class MailInboundSyncService {
  private userRepo = new UserRepository();

  private async resolvePhoto(payload: MailInboundPayload, previousPhoto?: string | null) {
    if (payload.avatar_base64) {
      const path = await savePhotoFromBase64(
        payload.avatar_base64,
        payload.avatar_content_type || 'image/jpeg'
      );
      if (previousPhoto) await deleteFile(previousPhoto);
      return path;
    }
    if (payload.avatar_url) {
      // Already an admin uploads URL - keep relative if same host
      const publicBase = (config.publicApiUrl || '').replace(/\/$/, '').replace(/\/api$/i, '');
      if (publicBase && payload.avatar_url.startsWith(publicBase)) {
        return payload.avatar_url.slice(publicBase.length) || payload.avatar_url;
      }
      if (payload.avatar_url.startsWith('/uploads/')) {
        return payload.avatar_url;
      }
      const downloaded = await savePhotoFromUrl(payload.avatar_url);
      if (downloaded) {
        if (previousPhoto) await deleteFile(previousPhoto);
        return downloaded;
      }
      // Fallback: store absolute URL so UI can still render it
      return payload.avatar_url;
    }
    return undefined;
  }

  async ensureFromMail(payload: MailInboundPayload) {
    const login = normalizeLogin(payload.username);
    if (!login) throw new Error('username is required');

    const email = MailSyncService.mailboxEmail(login, config.mail.domain).toLowerCase();
    const role = payload.is_admin ? 'admin' : 'user';
    const name = (payload.full_name || login).trim() || login;
    const phone =
      payload.phone === undefined ? undefined : payload.phone?.trim() || null;
    const jobTitle =
      payload.job_title === undefined ? undefined : payload.job_title?.trim() || null;
    const telegram =
      payload.telegram === undefined ? undefined : payload.telegram?.trim() || null;

    const existing = await this.userRepo.findByLogin(login);
    if (existing) {
      const photo = await this.resolvePhoto(payload, existing.photo);
      const data: {
        name?: string;
        role?: string;
        email?: string | null;
        phone?: string | null;
        jobTitle?: string | null;
        telegram?: string | null;
        password?: string;
        photo?: string | null;
      } = {
        name,
        role,
        email,
      };
      if (phone !== undefined) data.phone = phone;
      if (jobTitle !== undefined) data.jobTitle = jobTitle;
      if (telegram !== undefined) data.telegram = telegram;
      if (payload.password) {
        data.password = await bcrypt.hash(payload.password, 10);
      }
      if (photo !== undefined) data.photo = photo;
      return this.userRepo.update(existing.id, data);
    }

    if (!payload.password) {
      throw new Error('password is required to create admin user from mail');
    }

    const emailOwner = await this.userRepo.findByEmail(email);
    if (emailOwner) throw new Error('Email already exists');

    const photo = await this.resolvePhoto(payload);

    return this.userRepo.create({
      login,
      password: await bcrypt.hash(payload.password, 10),
      name,
      role,
      email,
      phone: phone ?? null,
      jobTitle: jobTitle ?? null,
      telegram: telegram ?? null,
      photo: photo ?? null,
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

    if (user.photo) await deleteFile(user.photo);
    await this.userRepo.delete(user.id);
    return { deleted: true };
  }
}
