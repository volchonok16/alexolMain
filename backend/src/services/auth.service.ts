import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { config } from '../config/env.js';
import { MailSyncService } from './mailSync.service.js';

const SSO_TYP = 'alexol-sso';
const SSO_TTL_SEC = 90;

type SsoTicketPayload = {
  typ: string;
  aud: 'mail' | 'admin';
  login: string;
  email: string;
  name: string;
};

export class AuthService {
  private userRepo = new UserRepository();
  private mailSync = new MailSyncService();

  private ssoSecret(): string {
    const secret = config.mail.syncSecret;
    if (!secret) {
      throw new Error('SSO is not configured (MAIL_SYNC_SECRET)');
    }
    return secret;
  }

  async login(data: { login: string; password: string }) {
    const identity = data.login.trim().toLowerCase();
    let user = await this.userRepo.findByLogin(identity);

    if (!user && identity.includes('@')) {
      user = await this.userRepo.findByEmail(identity);
      // Also accept login@MAIL_DOMAIN → lookup by local-part
      if (!user) {
        const [local, domain] = identity.split('@', 2);
        if (domain === config.mail.domain.toLowerCase() && local) {
          user = await this.userRepo.findByLogin(local);
        }
      }
    }

    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw new Error('Invalid credentials');

    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Keep mail mailbox password aligned with admin password on each login.
    void this.mailSync.ensureMailbox({
      username: user.login.toLowerCase(),
      full_name: user.name,
      password: data.password,
      is_admin: true,
      is_active: true,
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        photo: user.photo,
      },
    };
  }

  /** Short-lived ticket so admin panel can open mail.alexol.io without re-login. */
  async createMailTicket(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const login = user.login.toLowerCase();
    // Prefer mailbox address for mail SSO (custom admin email may be external).
    const mailEmail = `${login}@${config.mail.domain}`.toLowerCase();

    // Best-effort ensure — exchange auto-provisions if mailbox is still missing.
    void this.mailSync.ensureMailbox({
      username: login,
      full_name: user.name,
      is_admin: true,
      is_active: true,
    });

    const ticket = jwt.sign(
      {
        typ: SSO_TYP,
        aud: 'mail',
        login,
        email: mailEmail,
        name: user.name,
      } satisfies SsoTicketPayload,
      this.ssoSecret(),
      { expiresIn: SSO_TTL_SEC, algorithm: 'HS256' },
    );

    return { ticket, expiresIn: SSO_TTL_SEC };
  }

  /** Accept SSO ticket issued by mail-server → admin JWT. */
  async exchangeSsoTicket(ticket: string) {
    let payload: SsoTicketPayload;
    try {
      payload = jwt.verify(ticket, this.ssoSecret(), {
        algorithms: ['HS256'],
      }) as SsoTicketPayload;
    } catch {
      throw new Error('Invalid or expired SSO ticket');
    }

    const aud = payload.aud as string | string[] | undefined;
    const audOk = aud === 'admin' || (Array.isArray(aud) && aud.includes('admin'));
    if (payload.typ !== SSO_TYP || !audOk) {
      throw new Error('Invalid SSO ticket');
    }

    const login = (payload.login || '').toLowerCase();
    if (!login) throw new Error('Invalid SSO ticket');

    const user = await this.userRepo.findByLogin(login);
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const token = this.generateToken(user.id);
    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        photo: user.photo,
      },
    };
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
  }
}
