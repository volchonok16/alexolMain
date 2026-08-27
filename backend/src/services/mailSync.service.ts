import { config } from '../config/env.js';

type SyncEnsurePayload = {
  username: string;
  full_name: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
  phone?: string | null;
};

const FETCH_TIMEOUT_MS = 12_000;

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

/**
 * Provisions / updates / deletes mailboxes on mail.alexol.io
 * when users change in the alexolMain admin panel.
 *
 * Always uses POST /api/internal/users/ensure (upsert) so role/password
 * updates work even if the mailbox was missing.
 */
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

  /** Upsert mailbox. Returns true on success. */
  async ensureMailbox(payload: SyncEnsurePayload): Promise<boolean> {
    if (!this.enabled()) {
      log('skipped: MAIL_API_URL / MAIL_SYNC_SECRET not set');
      return false;
    }

    const body = {
      username: payload.username.trim().toLowerCase(),
      full_name: payload.full_name,
      password: payload.password,
      is_admin: Boolean(payload.is_admin),
      is_active: payload.is_active ?? true,
      phone: payload.phone ?? undefined,
    };

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
          log(`ensure ok for ${body.username} (admin=${body.is_admin})`);
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
    });

    const prev = username.trim().toLowerCase();
    if (ok && payload.new_username && prev !== nextUsername) {
      await this.deleteMailbox(prev);
    }
    return ok;
  }

  async deleteMailbox(username: string): Promise<void> {
    if (!this.enabled()) return;
    const login = username.trim().toLowerCase();
    try {
      const res = await fetch(
        this.url(`/api/internal/users/${encodeURIComponent(login)}`),
        this.fetchOpts({
          method: 'DELETE',
          headers: this.headers(),
        })
      );
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => '');
        log(`delete failed (${res.status})`, text);
      }
    } catch (err) {
      log('delete request error', formatFetchError(err));
    }
  }

  static mailboxEmail(login: string, domain = config.mail.domain): string {
    return `${login}@${domain}`;
  }
}
