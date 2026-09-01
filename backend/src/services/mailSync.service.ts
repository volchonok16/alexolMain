import { config } from '../config/env.js';

type SyncEnsurePayload = {
  username: string;
  full_name: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
  phone?: string | null;
  job_title?: string | null;
  telegram?: string | null;
  org_roles?: string[] | null;
  direction?: string | null;
  is_technical?: boolean;
  avatar_url?: string | null;
};

const FETCH_TIMEOUT_MS = 15_000;

const log = (message: string, detail?: unknown) => {
  if (detail !== undefined) {
    console.warn(`[mail-sync] ${message}`, detail);
  } else {
    console.warn(`[mail-sync] ${message}`);
  }
};

const formatFetchError = (err: unknown): string => {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
  if (cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || /Connect Timeout/i.test(cause?.message || '')) {
    return `connect timeout to ${config.mail.apiUrl} (is mail_backend on alexol_mail_sync?)`;
  }
  if (cause?.code || cause?.message) {
    return `${err.message}: ${cause.code || cause.message}`;
  }
  return err.message;
};

/** Build absolute public URL for admin-uploaded photo. */
export function toAbsolutePhotoUrl(photo: string | null | undefined): string | undefined {
  if (!photo) return undefined;
  if (/^https?:\/\//i.test(photo)) return photo;
  const base = (config.publicApiUrl || 'https://api.alexol.io').replace(/\/$/, '').replace(/\/api$/i, '');
  return `${base}${photo.startsWith('/') ? photo : `/${photo}`}`;
}

export class MailSyncService {
  private enabled() {
    return Boolean(config.mail.apiUrl && config.mail.syncSecret);
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Mail-Sync-Key': config.mail.syncSecret,
    };
  }

  private url(path: string) {
    return `${config.mail.apiUrl.replace(/\/$/, '')}${path}`;
  }

  private fetchOpts(init: RequestInit): RequestInit {
    return {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    };
  }

  async ensureMailbox(payload: SyncEnsurePayload): Promise<boolean> {
    if (!this.enabled()) {
      log('skipped: MAIL_API_URL / MAIL_SYNC_SECRET not set');
      return false;
    }

    const body: Record<string, unknown> = {
      username: payload.username.trim().toLowerCase(),
      full_name: payload.full_name,
      is_admin: Boolean(payload.is_admin),
      is_active: payload.is_active ?? true,
    };
    if (payload.password) body.password = payload.password;
    if (payload.phone !== undefined) body.phone = payload.phone;
    if (payload.job_title !== undefined) body.job_title = payload.job_title ?? '';
    if (payload.telegram !== undefined) body.telegram = payload.telegram ?? '';
    if (payload.org_roles !== undefined) body.org_roles = payload.org_roles ?? [];
    if (payload.direction !== undefined) body.direction = payload.direction ?? '';
    if (payload.is_technical !== undefined) body.is_technical = Boolean(payload.is_technical);
    if (payload.avatar_url) body.avatar_url = payload.avatar_url;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(
          this.url('/api/internal/users/ensure'),
          this.fetchOpts({
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
          })
        );
        if (res.ok) {
          log(`ensure ok for ${body.username} (admin=${body.is_admin}, avatar=${Boolean(payload.avatar_url)})`);
          return true;
        }
        const text = await res.text().catch(() => '');
        log(`ensure failed (${res.status}) attempt ${attempt}`, text);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        log(`ensure request error attempt ${attempt}`, formatFetchError(err));
        if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
      }
    }
    return false;
  }

  async createMailbox(payload: SyncEnsurePayload & { password: string }): Promise<boolean> {
    return this.ensureMailbox(payload);
  }

  async updateMailbox(
    username: string,
    payload: {
      full_name?: string;
      password?: string;
      is_admin?: boolean;
      is_active?: boolean;
      phone?: string | null;
      job_title?: string | null;
      telegram?: string | null;
      org_roles?: string[] | null;
      direction?: string | null;
      is_technical?: boolean;
      avatar_url?: string | null;
      new_username?: string;
    }
  ): Promise<boolean> {
    const nextUsername = (payload.new_username || username).trim().toLowerCase();
    const ok = await this.ensureMailbox({
      username: nextUsername,
      full_name: payload.full_name || nextUsername,
      password: payload.password,
      is_admin: payload.is_admin,
      is_active: payload.is_active,
      phone: payload.phone,
      job_title: payload.job_title,
      telegram: payload.telegram,
      org_roles: payload.org_roles,
      direction: payload.direction,
      is_technical: payload.is_technical,
      avatar_url: payload.avatar_url,
    });

    const prev = username.trim().toLowerCase();
    if (ok && payload.new_username && prev !== nextUsername) {
      const deletedOld = await this.deleteMailbox(prev);
      if (!deletedOld) {
        log(`rename: ensured ${nextUsername} but failed to delete old ${prev}`);
        return false;
      }
    }
    return ok;
  }

  /** Delete mailbox on mail-server. Returns true if deleted or already absent. */
  async deleteMailbox(username: string): Promise<boolean> {
    if (!this.enabled()) {
      log('delete skipped: MAIL_API_URL / MAIL_SYNC_SECRET not set');
      return false;
    }
    const login = username.trim().toLowerCase();
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(
          this.url(`/api/internal/users/${encodeURIComponent(login)}`),
          this.fetchOpts({
            method: 'DELETE',
            headers: this.headers(),
          })
        );
        if (res.ok || res.status === 404) {
          log(`delete ok for ${login} (${res.status})`);
          return true;
        }
        const text = await res.text().catch(() => '');
        log(`delete failed (${res.status}) attempt ${attempt}`, text);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        log(`delete request error attempt ${attempt}`, formatFetchError(err));
        if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
      }
    }
    return false;
  }

  static mailboxEmail(login: string, domain = config.mail.domain): string {
    return `${login}@${domain}`;
  }
}
