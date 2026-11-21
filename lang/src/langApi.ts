import { telegramInitData } from './telegram';

export type LangRole = 'student' | 'tutor' | 'admin' | 'superadmin';

export type LangAccount = {
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  isTutor: boolean;
  role: LangRole;
};

export type PanelId = 'study' | 'tutor' | 'admin';

export function panelsFor(account: LangAccount | null): PanelId[] {
  if (!account) return [];
  const tutor = Boolean(account.isTutor) || account.role === 'tutor';
  const admin = Boolean(account.isAdmin) || account.role === 'admin' || account.role === 'superadmin';
  if (!tutor && !admin) return [];
  const panels: PanelId[] = ['study', 'tutor'];
  if (admin) panels.push('admin');
  return panels;
}

export type RemoteLesson = {
  id: string;
  title: string;
  sortOrder: number;
};

export type RemoteWord = {
  id: string;
  lessonId: string | null;
  lang: string;
  front: string;
  back: string;
  image: string | null;
  example: string | null;
  stage: number;
  known: number;
  unknown: number;
  createdAt: string;
};

export type RemoteHomework = {
  id: string;
  lessonId: string | null;
  title: string;
  task: string;
  image: string | null;
  answer: string;
  review: string;
  checked: boolean;
  updatedAt: string;
};

export type LangStudent = LangAccount & {
  lessons: RemoteLesson[];
};

export type LangBundle = {
  user: LangAccount;
  lessons: RemoteLesson[];
  words: RemoteWord[];
  homework: RemoteHomework[];
};

export function isStaff(role: LangRole | undefined): boolean {
  return role === 'tutor' || role === 'admin' || role === 'superadmin';
}

export class LangApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DEV_KEY = 'lang-dev-user';

export function apiBase(): string {
  if (import.meta.env.VITE_LANG_API) return String(import.meta.env.VITE_LANG_API).replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'https://api.alexol.io';
}

export function setDevAccount(user: { id: string; firstName: string; role: LangRole; username?: string }) {
  sessionStorage.setItem(DEV_KEY, JSON.stringify(user));
}

export function clearDevAccount() {
  sessionStorage.removeItem(DEV_KEY);
}

export function hasDevAccount(): boolean {
  return Boolean(sessionStorage.getItem(DEV_KEY));
}

function encodeHeader(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function headers(): Record<string, string> {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  const initData = telegramInitData();
  if (initData) result.Authorization = `tma ${initData}`;
  else if (import.meta.env.DEV) {
    const dev = sessionStorage.getItem(DEV_KEY);
    if (dev) result['x-lang-dev-user'] = encodeHeader(dev);
  }
  return result;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new LangApiError(response.status, payload.error || 'Не удалось связаться с сервером');
  return payload as T;
}

export const langApi = {
  me: () => request<LangBundle>('/api/lang/me'),
  students: () => request<{ students: LangStudent[] }>('/api/lang/students'),
  student: (telegramId: string) => request<LangBundle>(`/api/lang/students/${encodeURIComponent(telegramId)}`),
  setAdmin: (telegramId: string, isAdmin: boolean) =>
    request<LangAccount>(`/api/lang/students/${encodeURIComponent(telegramId)}/admin`, {
      method: 'PATCH',
      body: JSON.stringify({ isAdmin }),
    }),
  setTutor: (telegramId: string, isTutor: boolean) =>
    request<LangAccount>(`/api/lang/students/${encodeURIComponent(telegramId)}/tutor`, {
      method: 'PATCH',
      body: JSON.stringify({ isTutor }),
    }),
  addLesson: (telegramId: string) =>
    request<RemoteLesson>(`/api/lang/students/${encodeURIComponent(telegramId)}/lessons`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  renameLesson: (id: string, title: string) =>
    request<RemoteLesson>(`/api/lang/lessons/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  deleteLesson: (id: string) => request<{ ok: true }>(`/api/lang/lessons/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addWord: (
    telegramId: string,
    body: { lang: string; front: string; back: string; image?: string; example?: string; lessonId: string },
  ) =>
    request<RemoteWord>(`/api/lang/students/${encodeURIComponent(telegramId)}/words`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteWord: (id: string) => request<{ ok: true }>(`/api/lang/words/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveProgress: (id: string, body: { stage: number; known: number; unknown: number }) =>
    request<RemoteWord>(`/api/lang/words/${encodeURIComponent(id)}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  resetProgress: (telegramId: string, lessonId?: string) =>
    request<{ ok: true }>(`/api/lang/students/${encodeURIComponent(telegramId)}/progress/reset`, {
      method: 'POST',
      body: JSON.stringify({ lessonId }),
    }),
  addHomework: (telegramId: string, body: { title: string; task: string; lessonId: string; image?: string }) =>
    request<RemoteHomework>(`/api/lang/students/${encodeURIComponent(telegramId)}/homework`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteHomework: (id: string) =>
    request<{ ok: true }>(`/api/lang/homework/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveAnswer: (id: string, answer: string) =>
    request<RemoteHomework>(`/api/lang/homework/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ answer }),
    }),
  reviewHomework: (id: string, body: { checked: boolean; review: string }) =>
    request<RemoteHomework>(`/api/lang/homework/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export function accountLabel(user: Pick<LangAccount, 'firstName' | 'lastName' | 'username'>): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return user.username ? `${name} · @${user.username}` : name;
}
