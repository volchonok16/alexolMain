import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';

export type LangRole = 'student' | 'tutor' | 'admin' | 'superadmin';

const SUPERADMIN_USERNAME = 'alex_tarasych';

export type LangIdentity = {
  telegramId: string;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  photoUrl?: string | null;
};

const LANGS = new Set(['en', 'es', 'fr', 'de']);
const IMAGE_LIMIT = 500_000;

export class LangError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function validateTelegramInitData(initData: string, botToken: string): LangIdentity | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !botToken) return null;
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!safeEqual(calculated, hash)) return null;

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) return null;

  const rawUser = params.get('user');
  if (!rawUser) return null;
  let user: { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
  try {
    user = JSON.parse(rawUser) as typeof user;
  } catch {
    return null;
  }
  if (!user.id || !user.first_name) return null;
  return {
    telegramId: String(user.id),
    firstName: user.first_name.slice(0, 80),
    lastName: user.last_name?.slice(0, 80) || null,
    username: user.username?.slice(0, 64) || null,
    photoUrl: user.photo_url?.slice(0, 500) || null,
  };
}

export function roleFor(user: { telegramId: string; username?: string | null; isAdmin?: boolean; isTutor?: boolean }): LangRole {
  const username = (user.username || '').replace(/^@/, '').toLowerCase();
  if (username === SUPERADMIN_USERNAME) return 'superadmin';
  if (user.isAdmin || config.langTutorIds.includes(user.telegramId)) return 'admin';
  if (user.isTutor) return 'tutor';
  return 'student';
}

export function isStaff(role: LangRole): boolean {
  return role === 'tutor' || role === 'admin' || role === 'superadmin';
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanImage(value: unknown): string | null {
  if (value == null || value === '') return null;
  const image = String(value);
  if (image.length > IMAGE_LIMIT) throw new LangError(400, 'Картинка слишком большая');
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
    throw new LangError(400, 'Нужна картинка JPEG, PNG или WebP');
  }
  return image;
}

function cleanLang(value: unknown): string {
  const lang = String(value || 'en');
  return LANGS.has(lang) ? lang : 'en';
}

const wordSelect = {
  id: true,
  lessonId: true,
  lang: true,
  front: true,
  back: true,
  image: true,
  example: true,
  stage: true,
  known: true,
  unknown: true,
  createdAt: true,
} as const;

const lessonSelect = {
  id: true,
  title: true,
  sortOrder: true,
} as const;

const homeworkSelect = {
  id: true,
  lessonId: true,
  title: true,
  task: true,
  image: true,
  answer: true,
  review: true,
  checked: true,
  updatedAt: true,
} as const;

export async function upsertLearner(identity: LangIdentity) {
  const user = await prisma.langLearner.upsert({
    where: { telegramId: identity.telegramId },
    create: {
      telegramId: identity.telegramId,
      firstName: identity.firstName,
      lastName: identity.lastName || null,
      username: identity.username || null,
      photoUrl: identity.photoUrl || null,
    },
    update: {
      firstName: identity.firstName,
      lastName: identity.lastName || null,
      username: identity.username || null,
      photoUrl: identity.photoUrl || null,
    },
  });
  return { ...user, role: roleFor(user) };
}

async function withLessons(telegramId: string) {
  const loose = await prisma.langAssignedWord.count({ where: { learnerId: telegramId, lessonId: null } });
  if (loose > 0) {
    const count = await prisma.langLesson.count({ where: { learnerId: telegramId } });
    const lesson = await prisma.langLesson.create({
      data: { learnerId: telegramId, title: `Урок ${count + 1}`, sortOrder: count + 1 },
    });
    await prisma.langAssignedWord.updateMany({
      where: { learnerId: telegramId, lessonId: null },
      data: { lessonId: lesson.id },
    });
  }
}

export async function bundleFor(telegramId: string) {
  const user = await prisma.langLearner.findUnique({ where: { telegramId } });
  if (!user) throw new LangError(404, 'Пользователь не найден');
  await withLessons(telegramId);
  const [lessons, words, homework] = await Promise.all([
    prisma.langLesson.findMany({
      where: { learnerId: telegramId },
      orderBy: { sortOrder: 'asc' },
      select: lessonSelect,
    }),
    prisma.langAssignedWord.findMany({
      where: { learnerId: telegramId },
      orderBy: { createdAt: 'desc' },
      select: wordSelect,
    }),
    prisma.langHomework.findMany({
      where: { learnerId: telegramId },
      orderBy: { createdAt: 'desc' },
      select: homeworkSelect,
    }),
  ]);
  return { user: { ...user, role: roleFor(user) }, lessons, words, homework };
}

export async function listStudents(actorId: string) {
  const actor = await prisma.langLearner.findUnique({ where: { telegramId: actorId } });
  if (!actor || !isStaff(roleFor(actor))) throw new LangError(403, 'Это админ-панель');
  const users = await prisma.langLearner.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      lessons: {
        select: { id: true, title: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  return users
    .filter((user) => user.telegramId !== actorId)
    .map((user) => ({ ...user, role: roleFor(user) }));
}

export async function setAdmin(actorId: string, targetId: string, isAdmin: boolean) {
  const actor = await prisma.langLearner.findUnique({ where: { telegramId: actorId } });
  if (!actor || roleFor(actor) !== 'superadmin') throw new LangError(403, 'Назначать админов может только суперадмин');
  const target = await prisma.langLearner.findUnique({ where: { telegramId: targetId } });
  if (!target) throw new LangError(404, 'Пользователь ещё не открывал карточки');
  if (roleFor(target) === 'superadmin') throw new LangError(400, 'Суперадмина нельзя снять');
  const saved = await prisma.langLearner.update({ where: { telegramId: targetId }, data: { isAdmin } });
  return { ...saved, role: roleFor(saved) };
}

export async function setTutor(actorId: string, targetId: string, isTutor: boolean) {
  const actor = await prisma.langLearner.findUnique({ where: { telegramId: actorId } });
  const actorRole = actor ? roleFor(actor) : 'student';
  if (!actor || (actorRole !== 'admin' && actorRole !== 'superadmin')) {
    throw new LangError(403, 'Назначать репетиторов может админ');
  }
  const target = await prisma.langLearner.findUnique({ where: { telegramId: targetId } });
  if (!target) throw new LangError(404, 'Пользователь ещё не открывал карточки');
  if (roleFor(target) === 'superadmin') throw new LangError(400, 'Суперадмина нельзя изменить');
  const saved = await prisma.langLearner.update({ where: { telegramId: targetId }, data: { isTutor } });
  return { ...saved, role: roleFor(saved) };
}

async function assertStaff(actorId: string, learnerId: string) {
  const actor = await prisma.langLearner.findUnique({ where: { telegramId: actorId } });
  if (!actor || !isStaff(roleFor(actor))) throw new LangError(403, 'Это админ-панель');
  const learner = await prisma.langLearner.findUnique({ where: { telegramId: learnerId } });
  if (!learner) throw new LangError(404, 'Ученик ещё не открывал карточки');
  return learner;
}

export async function addLesson(actorId: string, learnerId: string) {
  await assertStaff(actorId, learnerId);
  const count = await prisma.langLesson.count({ where: { learnerId } });
  return prisma.langLesson.create({
    data: { learnerId, title: `Урок ${count + 1}`, sortOrder: count + 1 },
    select: lessonSelect,
  });
}

export async function renameLesson(actorId: string, lessonId: string, titleInput: unknown) {
  const lesson = await prisma.langLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new LangError(404, 'Урок не найден');
  await assertStaff(actorId, lesson.learnerId);
  const title = cleanText(titleInput, 80);
  if (!title) throw new LangError(400, 'Нужно название урока');
  return prisma.langLesson.update({ where: { id: lessonId }, data: { title }, select: lessonSelect });
}

export async function removeLesson(actorId: string, lessonId: string) {
  const lesson = await prisma.langLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new LangError(404, 'Урок не найден');
  await assertStaff(actorId, lesson.learnerId);
  await prisma.langLesson.delete({ where: { id: lessonId } });
}

export async function addWord(
  actorId: string,
  learnerId: string,
  input: { lang?: unknown; front?: unknown; back?: unknown; image?: unknown; example?: unknown; lessonId?: unknown },
) {
  await assertStaff(actorId, learnerId);
  const front = cleanText(input.front, 160);
  const back = cleanText(input.back, 240);
  const lessonId = cleanText(input.lessonId, 80);
  if (!front || !back) throw new LangError(400, 'Нужны слово и перевод');
  if (!lessonId) throw new LangError(400, 'Сначала выбери урок');
  const lesson = await prisma.langLesson.findFirst({ where: { id: lessonId, learnerId } });
  if (!lesson) throw new LangError(404, 'Урок не найден');
  return prisma.langAssignedWord.create({
    data: {
      learnerId,
      lessonId,
      lang: cleanLang(input.lang),
      front,
      back,
      image: cleanImage(input.image),
      example: cleanText(input.example, 300) || null,
    },
    select: wordSelect,
  });
}

export async function removeWord(actorId: string, wordId: string) {
  const word = await prisma.langAssignedWord.findUnique({ where: { id: wordId } });
  if (!word) throw new LangError(404, 'Слово не найдено');
  await assertStaff(actorId, word.learnerId);
  await prisma.langAssignedWord.delete({ where: { id: wordId } });
}

export async function saveProgress(
  actorId: string,
  wordId: string,
  input: { stage?: unknown; known?: unknown; unknown?: unknown },
) {
  const word = await prisma.langAssignedWord.findUnique({ where: { id: wordId } });
  if (!word) throw new LangError(404, 'Слово не найдено');
  if (word.learnerId !== actorId) throw new LangError(403, 'Это слово другого ученика');
  const stage = Math.max(0, Math.min(15, Math.round(Number(input.stage) || 0)));
  return prisma.langAssignedWord.update({
    where: { id: wordId },
    data: {
      stage,
      known: Math.max(0, Math.round(Number(input.known) || 0)),
      unknown: Math.max(0, Math.round(Number(input.unknown) || 0)),
    },
    select: wordSelect,
  });
}

export async function resetProgress(actorId: string, learnerId: string, lessonId?: unknown) {
  await assertStaff(actorId, learnerId);
  const lesson = cleanText(lessonId, 80);
  await prisma.langAssignedWord.updateMany({
    where: { learnerId, ...(lesson ? { lessonId: lesson } : {}) },
    data: { stage: 0, known: 0, unknown: 0 },
  });
}

export async function addHomework(
  actorId: string,
  learnerId: string,
  input: { title?: unknown; task?: unknown; lessonId?: unknown; image?: unknown },
) {
  await assertStaff(actorId, learnerId);
  const title = cleanText(input.title, 120);
  const task = cleanText(input.task, 4000);
  const lessonId = cleanText(input.lessonId, 80);
  const image = cleanImage(input.image);
  if (!title || !task) throw new LangError(400, 'Нужны название и текст задания');
  if (!lessonId) throw new LangError(400, 'Сначала выбери урок');
  const lesson = await prisma.langLesson.findFirst({ where: { id: lessonId, learnerId } });
  if (!lesson) throw new LangError(404, 'Урок не найден');
  return prisma.langHomework.create({
    data: { learnerId, lessonId, title, task, image },
    select: homeworkSelect,
  });
}

export async function removeHomework(actorId: string, homeworkId: string) {
  const item = await prisma.langHomework.findUnique({ where: { id: homeworkId } });
  if (!item) throw new LangError(404, 'Задание не найдено');
  await assertStaff(actorId, item.learnerId);
  await prisma.langHomework.delete({ where: { id: homeworkId } });
}

export async function saveAnswer(actorId: string, homeworkId: string, answer: unknown) {
  const item = await prisma.langHomework.findUnique({ where: { id: homeworkId } });
  if (!item) throw new LangError(404, 'Задание не найдено');
  if (item.learnerId !== actorId) throw new LangError(403, 'Это задание другого ученика');
  const next = cleanText(answer, 4000);
  return prisma.langHomework.update({
    where: { id: homeworkId },
    data: { answer: next, ...(next !== item.answer ? { checked: false } : {}) },
    select: homeworkSelect,
  });
}

export async function reviewHomework(
  actorId: string,
  homeworkId: string,
  input: { checked?: unknown; review?: unknown },
) {
  const item = await prisma.langHomework.findUnique({ where: { id: homeworkId } });
  if (!item) throw new LangError(404, 'Задание не найдено');
  await assertStaff(actorId, item.learnerId);
  return prisma.langHomework.update({
    where: { id: homeworkId },
    data: { checked: Boolean(input.checked), review: cleanText(input.review, 2000) },
    select: homeworkSelect,
  });
}
