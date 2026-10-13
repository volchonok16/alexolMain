import { Response } from 'express';
import { LangRequest } from '../middleware/langAuth.js';
import {
  LangError,
  addHomework,
  addLesson,
  addWord,
  bundleFor,
  isStaff,
  listStudents,
  removeHomework,
  removeLesson,
  removeWord,
  renameLesson as renameLessonRecord,
  resetProgress,
  reviewHomework as reviewHomeworkRecord,
  saveAnswer,
  saveProgress,
  setAdmin,
  setTutor as setTutorRecord,
} from '../services/langTutor.service.js';

function fail(res: Response, error: unknown) {
  const status = error instanceof LangError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Ошибка запроса';
  res.status(status).json({ error: message });
}

export class LangTutorController {
  me = async (req: LangRequest, res: Response) => {
    try {
      res.json(await bundleFor(req.langUser!.telegramId));
    } catch (error) {
      fail(res, error);
    }
  };

  students = async (req: LangRequest, res: Response) => {
    try {
      res.json({ students: await listStudents(req.langUser!.telegramId) });
    } catch (error) {
      fail(res, error);
    }
  };

  student = async (req: LangRequest, res: Response) => {
    try {
      if (!isStaff(req.langUser!.role)) {
        return res.status(403).json({ error: 'Это админ-панель' });
      }
      res.json(await bundleFor(String(req.params.telegramId)));
    } catch (error) {
      fail(res, error);
    }
  };

  setAdmin = async (req: LangRequest, res: Response) => {
    try {
      const user = await setAdmin(req.langUser!.telegramId, String(req.params.telegramId), Boolean(req.body?.isAdmin));
      res.json(user);
    } catch (error) {
      fail(res, error);
    }
  };

  setTutor = async (req: LangRequest, res: Response) => {
    try {
      const user = await setTutorRecord(req.langUser!.telegramId, String(req.params.telegramId), Boolean(req.body?.isTutor));
      res.json(user);
    } catch (error) {
      fail(res, error);
    }
  };

  createLesson = async (req: LangRequest, res: Response) => {
    try {
      const lesson = await addLesson(req.langUser!.telegramId, String(req.params.telegramId));
      res.status(201).json(lesson);
    } catch (error) {
      fail(res, error);
    }
  };

  renameLesson = async (req: LangRequest, res: Response) => {
    try {
      const lesson = await renameLessonRecord(req.langUser!.telegramId, String(req.params.id), req.body?.title);
      res.json(lesson);
    } catch (error) {
      fail(res, error);
    }
  };

  deleteLesson = async (req: LangRequest, res: Response) => {
    try {
      await removeLesson(req.langUser!.telegramId, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      fail(res, error);
    }
  };

  saveProgress = async (req: LangRequest, res: Response) => {
    try {
      const word = await saveProgress(req.langUser!.telegramId, String(req.params.id), req.body || {});
      res.json(word);
    } catch (error) {
      fail(res, error);
    }
  };

  resetProgress = async (req: LangRequest, res: Response) => {
    try {
      await resetProgress(req.langUser!.telegramId, String(req.params.telegramId), req.body?.lessonId);
      res.json({ ok: true });
    } catch (error) {
      fail(res, error);
    }
  };

  createWord = async (req: LangRequest, res: Response) => {
    try {
      const word = await addWord(req.langUser!.telegramId, String(req.params.telegramId), req.body || {});
      res.status(201).json(word);
    } catch (error) {
      fail(res, error);
    }
  };

  deleteWord = async (req: LangRequest, res: Response) => {
    try {
      await removeWord(req.langUser!.telegramId, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      fail(res, error);
    }
  };

  createHomework = async (req: LangRequest, res: Response) => {
    try {
      const item = await addHomework(req.langUser!.telegramId, String(req.params.telegramId), req.body || {});
      res.status(201).json(item);
    } catch (error) {
      fail(res, error);
    }
  };

  deleteHomework = async (req: LangRequest, res: Response) => {
    try {
      await removeHomework(req.langUser!.telegramId, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      fail(res, error);
    }
  };

  saveAnswer = async (req: LangRequest, res: Response) => {
    try {
      const item = await saveAnswer(req.langUser!.telegramId, String(req.params.id), req.body?.answer);
      res.json(item);
    } catch (error) {
      fail(res, error);
    }
  };

  reviewHomework = async (req: LangRequest, res: Response) => {
    try {
      const item = await reviewHomeworkRecord(req.langUser!.telegramId, String(req.params.id), req.body || {});
      res.json(item);
    } catch (error) {
      fail(res, error);
    }
  };
}
