import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';

type Role = 'student' | 'tutor' | 'admin' | 'superadmin';

type User = {
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  isTutor: boolean;
  updatedAt: string;
};

type Lesson = {
  id: string;
  learnerId: string;
  title: string;
  sortOrder: number;
};

type Word = {
  id: string;
  learnerId: string;
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

type Homework = {
  id: string;
  learnerId: string;
  lessonId: string | null;
  title: string;
  task: string;
  image: string | null;
  answer: string;
  review: string;
  checked: boolean;
  createdAt: string;
  updatedAt: string;
};

type Db = { users: User[]; lessons: Lesson[]; words: Word[]; homework: Homework[] };

const FILE = resolve(process.cwd(), '.data/lang-store.json');

function load(): Db {
  try {
    const raw = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<Db> & { users: Array<User & { role?: string }> };
    const users = (raw.users || []).map((user) => ({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName ?? null,
      username: user.username ?? null,
      photoUrl: user.photoUrl ?? null,
      isAdmin: Boolean(user.isAdmin || user.role === 'tutor' || user.role === 'admin' || user.role === 'superadmin'),
      isTutor: Boolean(user.isTutor),
      updatedAt: user.updatedAt,
    }));
    const words = (raw.words || []).map((word) => ({
      ...word,
      lessonId: word.lessonId ?? null,
      stage: word.stage ?? 0,
      known: word.known ?? 0,
      unknown: word.unknown ?? 0,
    }));
    const homework = (raw.homework || []).map((item) => ({
      ...item,
      lessonId: item.lessonId ?? null,
      image: item.image ?? null,
      review: item.review ?? '',
      checked: Boolean(item.checked),
    }));
    return { users, lessons: raw.lessons || [], words, homework };
  } catch {
    return { users: [], lessons: [], words: [], homework: [] };
  }
}

function save(db: Db) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(db));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function decodeHeader(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  return Buffer.from(trimmed, 'base64').toString('utf8');
}

function roleFor(user: Pick<User, 'username' | 'isAdmin' | 'isTutor'>): Role {
  const username = (user.username || '').replace(/^@/, '').toLowerCase();
  if (username === 'alex_tarasych') return 'superadmin';
  if (user.isAdmin) return 'admin';
  if (user.isTutor) return 'tutor';
  return 'student';
}

function isStaff(user: User): boolean {
  return roleFor(user) !== 'student';
}

function present(user: User) {
  return { ...user, role: roleFor(user) };
}

function identity(req: IncomingMessage): User | null {
  const raw = req.headers['x-lang-dev-user'];
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(decodeHeader(raw)) as {
      id?: string;
      firstName?: string;
      role?: string;
      username?: string;
    };
    if (!parsed.id || !parsed.firstName) return null;
    const db = load();
    const now = new Date().toISOString();
    const index = db.users.findIndex((user) => user.telegramId === String(parsed.id));
    const existing = index >= 0 ? db.users[index] : undefined;
    const username =
      parsed.username ||
      existing?.username ||
      (parsed.role === 'superadmin' ? 'alex_tarasych' : null);
    const next: User = {
      telegramId: String(parsed.id),
      firstName: parsed.firstName,
      lastName: existing?.lastName ?? null,
      username,
      photoUrl: existing?.photoUrl ?? null,
      isAdmin: Boolean(existing?.isAdmin || parsed.role === 'admin' || parsed.role === 'superadmin'),
      isTutor: Boolean(existing?.isTutor || parsed.role === 'tutor'),
      updatedAt: now,
    };
    if (index >= 0) db.users[index] = next;
    else db.users.push(next);
    save(db);
    return next;
  } catch {
    return null;
  }
}

function publicWord(word: Word) {
  return {
    id: word.id,
    lessonId: word.lessonId,
    lang: word.lang,
    front: word.front,
    back: word.back,
    image: word.image,
    example: word.example,
    stage: word.stage,
    known: word.known,
    unknown: word.unknown,
    createdAt: word.createdAt,
  };
}

function publicHomework(item: Homework) {
  return {
    id: item.id,
    lessonId: item.lessonId,
    title: item.title,
    task: item.task,
    image: item.image,
    answer: item.answer,
    review: item.review,
    checked: item.checked,
    updatedAt: item.updatedAt,
  };
}

function bundle(db: Db, telegramId: string) {
  const user = db.users.find((item) => item.telegramId === telegramId);
  if (!user) return null;
  const loose = db.words.filter((word) => word.learnerId === telegramId && !word.lessonId);
  if (loose.length) {
    const count = db.lessons.filter((lesson) => lesson.learnerId === telegramId).length;
    const lesson: Lesson = {
      id: randomUUID(),
      learnerId: telegramId,
      title: `Урок ${count + 1}`,
      sortOrder: count + 1,
    };
    db.lessons.push(lesson);
    loose.forEach((word) => {
      word.lessonId = lesson.id;
    });
    save(db);
  }
  return {
    user: present(user),
    lessons: db.lessons
      .filter((lesson) => lesson.learnerId === telegramId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, title, sortOrder }) => ({ id, title, sortOrder })),
    words: db.words.filter((word) => word.learnerId === telegramId).map(publicWord),
    homework: db.homework.filter((item) => item.learnerId === telegramId).map(publicHomework),
  };
}

export function langDevApi(): Plugin {
  return {
    name: 'lang-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/lang')) return next();
        const user = identity(req);
        if (!user) return send(res, 401, { error: 'Открой карточки из Telegram' });
        const db = load();
        const path = url.pathname;
        const method = req.method || 'GET';
        const staff = () => {
          if (!isStaff(user)) {
            send(res, 403, { error: 'Это админ-панель' });
            return false;
          }
          return true;
        };

        try {
          if (method === 'GET' && path === '/api/lang/me') {
            return send(res, 200, bundle(load(), user.telegramId));
          }
          if (method === 'GET' && path === '/api/lang/students') {
            if (!staff()) return;
            const fresh = load();
            return send(res, 200, {
              students: fresh.users
                .filter((item) => item.telegramId !== user.telegramId)
                .map((item) => ({
                  ...present(item),
                  lessons: fresh.lessons
                    .filter((lesson) => lesson.learnerId === item.telegramId)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((lesson) => ({ id: lesson.id, title: lesson.title, sortOrder: lesson.sortOrder })),
                })),
            });
          }
          const adminMatch = path.match(/^\/api\/lang\/students\/([^/]+)\/admin$/);
          if (method === 'PATCH' && adminMatch) {
            if (roleFor(user) !== 'superadmin') return send(res, 403, { error: 'Назначать админов может только суперадмин' });
            const target = db.users.find((item) => item.telegramId === decodeURIComponent(adminMatch[1]));
            if (!target) return send(res, 404, { error: 'Пользователь ещё не открывал карточки' });
            if (roleFor(target) === 'superadmin') return send(res, 400, { error: 'Суперадмина нельзя снять' });
            const body = JSON.parse((await readBody(req)) || '{}') as { isAdmin?: boolean };
            target.isAdmin = Boolean(body.isAdmin);
            save(db);
            return send(res, 200, present(target));
          }
          const tutorMatch = path.match(/^\/api\/lang\/students\/([^/]+)\/tutor$/);
          if (method === 'PATCH' && tutorMatch) {
            if (roleFor(user) !== 'admin' && roleFor(user) !== 'superadmin') {
              return send(res, 403, { error: 'Назначать репетиторов может админ' });
            }
            const target = db.users.find((item) => item.telegramId === decodeURIComponent(tutorMatch[1]));
            if (!target) return send(res, 404, { error: 'Пользователь ещё не открывал карточки' });
            if (roleFor(target) === 'superadmin') return send(res, 400, { error: 'Суперадмина нельзя изменить' });
            const body = JSON.parse((await readBody(req)) || '{}') as { isTutor?: boolean };
            target.isTutor = Boolean(body.isTutor);
            save(db);
            return send(res, 200, present(target));
          }
          const studentMatch = path.match(/^\/api\/lang\/students\/([^/]+)$/);
          if (method === 'GET' && studentMatch) {
            if (!staff()) return;
            const found = bundle(load(), decodeURIComponent(studentMatch[1]));
            if (!found) return send(res, 404, { error: 'Ученик ещё не открывал карточки' });
            return send(res, 200, found);
          }
          const lessonCreate = path.match(/^\/api\/lang\/students\/([^/]+)\/lessons$/);
          if (method === 'POST' && lessonCreate) {
            if (!staff()) return;
            const learnerId = decodeURIComponent(lessonCreate[1]);
            if (!db.users.some((item) => item.telegramId === learnerId)) {
              return send(res, 404, { error: 'Ученик ещё не открывал карточки' });
            }
            const count = db.lessons.filter((lesson) => lesson.learnerId === learnerId).length;
            const lesson: Lesson = {
              id: randomUUID(),
              learnerId,
              title: `Урок ${count + 1}`,
              sortOrder: count + 1,
            };
            db.lessons.push(lesson);
            save(db);
            return send(res, 201, { id: lesson.id, title: lesson.title, sortOrder: lesson.sortOrder });
          }
          const lessonRename = path.match(/^\/api\/lang\/lessons\/([^/]+)$/);
          if (method === 'PATCH' && lessonRename) {
            if (!staff()) return;
            const lesson = db.lessons.find((item) => item.id === decodeURIComponent(lessonRename[1]));
            if (!lesson) return send(res, 404, { error: 'Урок не найден' });
            const body = JSON.parse((await readBody(req)) || '{}') as { title?: string };
            const title = (body.title || '').trim().slice(0, 80);
            if (!title) return send(res, 400, { error: 'Нужно название урока' });
            lesson.title = title;
            save(db);
            return send(res, 200, { id: lesson.id, title: lesson.title, sortOrder: lesson.sortOrder });
          }
          const lessonDelete = path.match(/^\/api\/lang\/lessons\/([^/]+)$/);
          if (method === 'DELETE' && lessonDelete) {
            if (!staff()) return;
            const id = decodeURIComponent(lessonDelete[1]);
            db.lessons = db.lessons.filter((lesson) => lesson.id !== id);
            db.words = db.words.filter((word) => word.lessonId !== id);
            db.homework = db.homework.filter((item) => item.lessonId !== id);
            save(db);
            return send(res, 200, { ok: true });
          }
          const wordCreate = path.match(/^\/api\/lang\/students\/([^/]+)\/words$/);
          if (method === 'POST' && wordCreate) {
            if (!staff()) return;
            const learnerId = decodeURIComponent(wordCreate[1]);
            const body = JSON.parse((await readBody(req)) || '{}') as {
              front?: string;
              back?: string;
              image?: string;
              example?: string;
              lang?: string;
              lessonId?: string;
            };
            const front = (body.front || '').trim();
            const back = (body.back || '').trim();
            if (!front || !back) return send(res, 400, { error: 'Нужны слово и перевод' });
            if (!body.lessonId || !db.lessons.some((lesson) => lesson.id === body.lessonId && lesson.learnerId === learnerId)) {
              return send(res, 400, { error: 'Сначала выбери урок' });
            }
            const word: Word = {
              id: randomUUID(),
              learnerId,
              lessonId: body.lessonId,
              lang: body.lang || 'en',
              front,
              back,
              image: body.image || null,
              example: body.example || null,
              stage: 0,
              known: 0,
              unknown: 0,
              createdAt: new Date().toISOString(),
            };
            db.words.unshift(word);
            save(db);
            return send(res, 201, publicWord(word));
          }
          const progressSave = path.match(/^\/api\/lang\/words\/([^/]+)\/progress$/);
          if (method === 'PATCH' && progressSave) {
            const word = db.words.find((item) => item.id === decodeURIComponent(progressSave[1]));
            if (!word) return send(res, 404, { error: 'Слово не найдено' });
            if (word.learnerId !== user.telegramId) return send(res, 403, { error: 'Это слово другого ученика' });
            const body = JSON.parse((await readBody(req)) || '{}') as { stage?: number; known?: number; unknown?: number };
            word.stage = Math.max(0, Math.min(15, Math.round(Number(body.stage) || 0)));
            word.known = Math.max(0, Math.round(Number(body.known) || 0));
            word.unknown = Math.max(0, Math.round(Number(body.unknown) || 0));
            save(db);
            return send(res, 200, publicWord(word));
          }
          const resetMatch = path.match(/^\/api\/lang\/students\/([^/]+)\/progress\/reset$/);
          if (method === 'POST' && resetMatch) {
            if (!staff()) return;
            const learnerId = decodeURIComponent(resetMatch[1]);
            const body = JSON.parse((await readBody(req)) || '{}') as { lessonId?: string };
            db.words.forEach((word) => {
              if (word.learnerId !== learnerId) return;
              if (body.lessonId && word.lessonId !== body.lessonId) return;
              word.stage = 0;
              word.known = 0;
              word.unknown = 0;
            });
            save(db);
            return send(res, 200, { ok: true });
          }
          const wordDelete = path.match(/^\/api\/lang\/words\/([^/]+)$/);
          if (method === 'DELETE' && wordDelete) {
            if (!staff()) return;
            const id = decodeURIComponent(wordDelete[1]);
            db.words = db.words.filter((word) => word.id !== id);
            save(db);
            return send(res, 200, { ok: true });
          }
          const homeworkCreate = path.match(/^\/api\/lang\/students\/([^/]+)\/homework$/);
          if (method === 'POST' && homeworkCreate) {
            if (!staff()) return;
            const learnerId = decodeURIComponent(homeworkCreate[1]);
            if (!db.users.some((item) => item.telegramId === learnerId)) {
              return send(res, 404, { error: 'Ученик ещё не открывал карточки' });
            }
            const body = JSON.parse((await readBody(req)) || '{}') as {
              title?: string;
              task?: string;
              lessonId?: string;
              image?: string;
            };
            const title = (body.title || '').trim();
            const task = (body.task || '').trim();
            if (!title || !task) return send(res, 400, { error: 'Нужны название и текст задания' });
            if (body.image && (body.image.length > 500_000 || !/^data:image\/(jpeg|png|webp);base64,/.test(body.image))) {
              return send(res, 400, { error: 'Нужна картинка JPEG, PNG или WebP' });
            }
            if (!body.lessonId || !db.lessons.some((lesson) => lesson.id === body.lessonId && lesson.learnerId === learnerId)) {
              return send(res, 400, { error: 'Сначала выбери урок' });
            }
            const item: Homework = {
              id: randomUUID(),
              learnerId,
              lessonId: body.lessonId,
              title,
              task,
              image: body.image || null,
              answer: '',
              review: '',
              checked: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            db.homework.unshift(item);
            save(db);
            return send(res, 201, publicHomework(item));
          }
          const homeworkDelete = path.match(/^\/api\/lang\/homework\/([^/]+)$/);
          if (method === 'DELETE' && homeworkDelete) {
            if (!staff()) return;
            const id = decodeURIComponent(homeworkDelete[1]);
            db.homework = db.homework.filter((item) => item.id !== id);
            save(db);
            return send(res, 200, { ok: true });
          }
          const homeworkReview = path.match(/^\/api\/lang\/homework\/([^/]+)\/review$/);
          if (method === 'PATCH' && homeworkReview) {
            if (!staff()) return;
            const item = db.homework.find((entry) => entry.id === decodeURIComponent(homeworkReview[1]));
            if (!item) return send(res, 404, { error: 'Задание не найдено' });
            const body = JSON.parse((await readBody(req)) || '{}') as { checked?: boolean; review?: string };
            item.checked = Boolean(body.checked);
            item.review = (body.review || '').trim().slice(0, 2000);
            item.updatedAt = new Date().toISOString();
            save(db);
            return send(res, 200, publicHomework(item));
          }
          const homeworkSave = path.match(/^\/api\/lang\/homework\/([^/]+)$/);
          if (method === 'PATCH' && homeworkSave) {
            const id = decodeURIComponent(homeworkSave[1]);
            const item = db.homework.find((entry) => entry.id === id);
            if (!item) return send(res, 404, { error: 'Задание не найдено' });
            if (item.learnerId !== user.telegramId) return send(res, 403, { error: 'Это задание другого ученика' });
            const body = JSON.parse((await readBody(req)) || '{}') as { answer?: string };
            const next = (body.answer || '').trim().slice(0, 4000);
            if (next !== item.answer) item.checked = false;
            item.answer = next;
            item.updatedAt = new Date().toISOString();
            save(db);
            return send(res, 200, publicHomework(item));
          }
          return send(res, 404, { error: 'Не найдено' });
        } catch {
          return send(res, 400, { error: 'Некорректные данные' });
        }
      });
    },
  };
}
