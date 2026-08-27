import { config } from '../config/env.js';

type SyncCreatePayload = {
  username: string;
  full_name: string;
  password: string;
  is_admin?: boolean;
  is_active?: boolean;
  phone?: string | null;
};

type SyncEnsurePayload = {
  username: string;
  full_name: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
  phone?: string | null;
};

type SyncUpdatePayload = {
  full_name?: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
  phone?: string | null;
  new_username?: string;
};

const FETCH_TIMEOUT_MS = 8_000;

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

  /** Ensure mailbox exists (creates with random password if missing and no password given). */
  async ensureMailbox(payload: SyncEnsurePayload): Promise<boolean> {
    if (!this.enabled()) {
      log('skipped: MAIL_API_URL / MAIL_SYNC_SECRET not set');
      return false;
    }
    try {
      const res = await fetch(
        this.url('/api/internal/users/ensure'),
        this.fetchOpts({
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            username: payload.username,
            full_name: payload.full_name,
            password: payload.password,
            is_admin: payload.is_admin ?? false,
            is_active: payload.is_active ?? true,
            phone: payload.phone ?? undefined,
          }),
        })
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log(`ensure failed (${res.status})`, text);
        return false;
      }
      return true;
    } catch (err) {
      log('ensure request error', formatFetchError(err));
      return false;
    }
  }

  async createMailbox(payload: SyncCreatePayload): Promise<boolean> {
    if (!this.enabled()) return false;
    try {
      const res = await fetch(
        this.url('/api/internal/users'),
        this.fetchOpts({
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            username: payload.username,
            full_name: payload.full_name,
            password: payload.password,
            is_admin: payload.is_admin ?? false,
            is_active: payload.is_active ?? true,
            phone: payload.phone ?? undefined,
          }),
        })
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log(`create failed (${res.status})`, text);
        return false;
      }
      return true;
    } catch (err) {
      log('create request error', formatFetchError(err));
      return false;
    }
  }

  async updateMailbox(username: string, payload: SyncUpdatePayload): Promise<boolean> {
    if (!this.enabled()) return false;
    try {
      const res = await fetch(
        this.url(`/api/internal/users/${encodeURIComponent(username)}`),
        this.fetchOpts({
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify(payload),
        })
      );
      if (res.status === 404) {
        return this.ensureMailbox({
          username: payload.new_username || username,
          full_name: payload.full_name || username,
          password: payload.password,
          is_admin: payload.is_admin,
          is_active: payload.is_active,
          phone: payload.phone,
        });
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log(`update failed (${res.status})`, text);
        return false;
      }
      return true;
    } catch (err) {
      log('update request error', formatFetchError(err));
      return false;
    }
  }

  async deleteMailbox(username: string): Promise<void> {
    if (!this.enabled()) return;
    try {
      const res = await fetch(
        this.url(`/api/internal/users/${encodeURIComponent(username)}`),
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

  /** Default mailbox address for a given login. */
  static mailboxEmail(login: string, domain = config.mail.domain): string {
    return `${login}@${domain}`;
  }
}
