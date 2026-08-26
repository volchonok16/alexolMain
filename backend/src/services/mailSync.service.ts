import { config } from '../config/env.js';

type SyncCreatePayload = {
  username: string;
  full_name: string;
  password: string;
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

const log = (message: string, detail?: unknown) => {
  if (detail !== undefined) {
    console.warn(`[mail-sync] ${message}`, detail);
  } else {
    console.warn(`[mail-sync] ${message}`);
  }
};

/**
 * Provisions / updates / deletes mailboxes on mail.alexol.io
 * when users change in the alexolMain admin panel.
 * Failures are logged and do not roll back the main user CRUD
 * (mailbox can be retried by editing the user again).
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

  async createMailbox(payload: SyncCreatePayload): Promise<void> {
    if (!this.enabled()) return;
    try {
      const res = await fetch(this.url('/api/internal/users'), {
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
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log(`create failed (${res.status})`, text);
      }
    } catch (err) {
      log('create request error', err);
    }
  }

  async updateMailbox(username: string, payload: SyncUpdatePayload): Promise<void> {
    if (!this.enabled()) return;
    try {
      const res = await fetch(this.url(`/api/internal/users/${encodeURIComponent(username)}`), {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      if (res.status === 404 && payload.password) {
        // Mailbox missing — provision on the fly if we have a password
        await this.createMailbox({
          username: payload.new_username || username,
          full_name: payload.full_name || username,
          password: payload.password,
          is_admin: payload.is_admin,
          is_active: payload.is_active,
          phone: payload.phone,
        });
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log(`update failed (${res.status})`, text);
      }
    } catch (err) {
      log('update request error', err);
    }
  }

  async deleteMailbox(username: string): Promise<void> {
    if (!this.enabled()) return;
    try {
      const res = await fetch(this.url(`/api/internal/users/${encodeURIComponent(username)}`), {
        method: 'DELETE',
        headers: this.headers(),
      });
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => '');
        log(`delete failed (${res.status})`, text);
      }
    } catch (err) {
      log('delete request error', err);
    }
  }

  /** Default mailbox address for a given login. */
  static mailboxEmail(login: string, domain = config.mail.domain): string {
    return `${login}@${domain}`;
  }
}
