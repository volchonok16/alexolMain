import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LANGS } from './data';
import { WordRing } from './dictionary';
import { readCardImage } from './imageFile';
import { accountLabel, langApi, panelsFor, type LangAccount, type LangBundle, type PanelId } from './langApi';
import type { LangId } from './types';

function roleName(user: Pick<LangAccount, 'role' | 'isAdmin' | 'isTutor'>) {
  if (user.role === 'superadmin') return 'суперадмин';
  const parts: string[] = [];
  if (user.role === 'admin' || user.isAdmin) parts.push('админ');
  if (user.role === 'tutor' || user.isTutor) parts.push('репетитор');
  return parts.join(' · ') || 'ученик';
}

const PANEL_LABEL: Record<PanelId, string> = {
  study: 'Учёба',
  tutor: 'Репетитор',
  admin: 'Админ',
};

export function PanelSwitch({
  account,
  panel,
  onChange,
}: {
  account: LangAccount | null;
  panel: PanelId;
  onChange: (panel: PanelId) => void;
}) {
  const panels = panelsFor(account);
  if (panels.length < 2) return null;
  return (
    <div className="staff-switch" role="tablist" aria-label="Панель" style={{ ['--switch-cols' as string]: panels.length }}>
      {panels.map((item) => (
        <button key={item} className={panel === item ? 'is-active' : ''} type="button" onClick={() => onChange(item)}>
          {PANEL_LABEL[item]}
        </button>
      ))}
    </div>
  );
}

export function TutorScreen({
  mode,
  account,
  panel,
  onPanel,
  onBack,
}: {
  mode: 'tutor' | 'admin';
  account: LangAccount | null;
  panel: PanelId;
  onPanel: (panel: PanelId) => void;
  onBack: () => void;
}) {
  const [me, setMe] = useState<LangAccount | null>(null);
  const [students, setStudents] = useState<LangAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<LangBundle | null>(null);
  const [lessonId, setLessonId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [error, setError] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [image, setImage] = useState('');
  const [lang, setLang] = useState<LangId>('en');
  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const loadStudents = async () => {
    const [account, result] = await Promise.all([langApi.me(), langApi.students()]);
    setMe(account.user);
    setStudents(result.students);
  };

  const openStudent = async (telegramId: string) => {
    setSelectedId(telegramId);
    const next = await langApi.student(telegramId);
    setBundle(next);
    setLessonId((current) =>
      next.lessons.some((lesson) => lesson.id === current) ? current : next.lessons[0]?.id ?? '',
    );
  };

  useEffect(() => {
    setDraftTitle(bundle?.lessons.find((lesson) => lesson.id === lessonId)?.title ?? '');
  }, [bundle, lessonId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    bundle?.homework.forEach((item) => {
      next[item.id] = item.review;
    });
    setReviews(next);
  }, [bundle]);

  useEffect(() => {
    loadStudents().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить учеников'));
  }, []);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не получилось');
    } finally {
      setBusy(false);
    }
  };

  const addLesson = () =>
    run(async () => {
      if (!selectedId) return;
      const created = await langApi.addLesson(selectedId);
      setLessonId(created.id);
      await openStudent(selectedId);
    });

  const renameLesson = () =>
    run(async () => {
      if (!selectedId || !lessonId || !draftTitle.trim()) return;
      await langApi.renameLesson(lessonId, draftTitle.trim());
      await openStudent(selectedId);
    });

  const addWord = () =>
    run(async () => {
      if (!selectedId || !lessonId || !front.trim() || !back.trim()) return;
      await langApi.addWord(selectedId, { lang, front, back, image: image || undefined, lessonId });
      setFront('');
      setBack('');
      setImage('');
      await openStudent(selectedId);
    });

  const addTask = () =>
    run(async () => {
      if (!selectedId || !lessonId || !title.trim() || !task.trim()) return;
      await langApi.addHomework(selectedId, { title, task, lessonId });
      setTitle('');
      setTask('');
      await openStudent(selectedId);
    });

  const checkTask = (id: string, checked: boolean) =>
    run(async () => {
      if (!selectedId) return;
      await langApi.reviewHomework(id, { checked, review: reviews[id] ?? '' });
      await openStudent(selectedId);
    });

  const lessonWords = bundle?.words.filter((word) => word.lessonId === lessonId) ?? [];
  const lessonTasks = bundle?.homework.filter((item) => item.lessonId === lessonId) ?? [];
  const looseTasks = bundle?.homework.filter((item) => !item.lessonId) ?? [];
  const selectedLesson = bundle?.lessons.find((lesson) => lesson.id === lessonId);

  return (
    <>
      <header className="top">
        <button
          className="back-btn"
          type="button"
          aria-label="Назад"
          onClick={() => {
            if (selectedId) {
              setSelectedId(null);
              setBundle(null);
              setLessonId('');
              return;
            }
            onBack();
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>{bundle ? accountLabel(bundle.user) : mode === 'tutor' ? 'Репетитор' : 'Админ'}</h1>
          <p>{bundle ? roleName(bundle.user) : mode === 'tutor' ? 'Уроки и задания ученикам' : 'Роли, уроки и задания'}</p>
        </div>
      </header>
      <PanelSwitch account={account} panel={panel} onChange={onPanel} />
      {error && <p className="hint-line">{error}</p>}
      {!selectedId &&
        (students.length === 0 ? (
          <p className="empty">Пользователь появится здесь, когда откроет карточки из Telegram.</p>
        ) : (
          <div className="list">
            {students.map((student) => {
              const canSetAdmin = mode === 'admin' && me?.role === 'superadmin' && student.role !== 'superadmin';
              const canSetTutor = mode === 'admin' && (me?.role === 'admin' || me?.role === 'superadmin') && student.role !== 'superadmin';
              return (
              <div key={student.telegramId} className="word admin-user">
                <button className="word-btn" type="button" onClick={() => void openStudent(student.telegramId)}>
                  <div className="front">{accountLabel(student)}</div>
                  <div className="translation">{roleName(student)} · уроки и слова</div>
                </button>
                {(canSetAdmin || canSetTutor) && (
                  <div className="admin-actions">
                    {canSetAdmin && (
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await langApi.setAdmin(student.telegramId, student.role !== 'admin');
                            await loadStudents();
                          })
                        }
                      >
                        {student.role === 'admin' ? 'Снять админа' : 'Админ'}
                      </button>
                    )}
                    {canSetTutor && (
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await langApi.setTutor(student.telegramId, !(student.isTutor || student.role === 'tutor'));
                            await loadStudents();
                          })
                        }
                      >
                        {student.isTutor || student.role === 'tutor' ? 'Снять репетитора' : 'Репетитор'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        ))}
      {selectedId && bundle && (
        <>
          <div className="form">
            <h2>Урок</h2>
            <button className="btn primary" type="button" disabled={busy} onClick={() => void addLesson()}>
              Создать «Урок {bundle.lessons.length + 1}»
            </button>
            {bundle.lessons.length > 0 && (
              <label>
                Открытый урок
                <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
                  {bundle.lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedLesson && (
              <label>
                Название
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void renameLesson();
                    }
                  }}
                />
              </label>
            )}
            {selectedLesson && draftTitle.trim() !== selectedLesson.title && (
              <button className="btn ghost" type="button" disabled={busy || !draftTitle.trim()} onClick={() => void renameLesson()}>
                Сохранить название
              </button>
            )}
            {selectedLesson && (
              <div className="admin-actions">
                <button
                  className="btn ghost"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await langApi.resetProgress(selectedId, selectedLesson.id);
                      await openStudent(selectedId);
                    })
                  }
                >
                  Сбросить прогресс урока
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await langApi.deleteLesson(selectedLesson.id);
                      setLessonId('');
                      await openStudent(selectedId);
                    })
                  }
                >
                  Удалить урок
                </button>
              </div>
            )}
            <button
              className="btn ghost"
              type="button"
              disabled={busy || bundle.words.length === 0}
              onClick={() =>
                void run(async () => {
                  await langApi.resetProgress(selectedId);
                  await openStudent(selectedId);
                })
              }
            >
              Сбросить прогресс всех слов
            </button>
          </div>

          <form
            className="form task-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addWord();
            }}
          >
            <h2>Слово в {selectedLesson?.title ?? 'урок'}</h2>
            <label>
              Язык
              <select value={lang} onChange={(event) => setLang(event.target.value as LangId)}>
                {LANGS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameRu}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Слово
              <input value={front} onChange={(event) => setFront(event.target.value)} placeholder="airport" />
            </label>
            <label>
              Перевод
              <input value={back} onChange={(event) => setBack(event.target.value)} placeholder="аэропорт" />
            </label>
            <label>
              Картинка, если нужна
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    setImage(await readCardImage(file));
                  } catch (reason) {
                    setError(reason instanceof Error ? reason.message : 'Картинка не прочиталась');
                  }
                }}
              />
            </label>
            {image && <img className="preview" src={image} alt="" />}
            <button className="btn primary" type="submit" disabled={busy || !lessonId}>
              Добавить в урок
            </button>
          </form>
          <div className="list">
            {lessonWords.map((word) => (
              <div key={word.id} className="word">
                {word.image && <img className="word-photo" src={word.image} alt="" />}
                <div className="word-main">
                  <div className="front">{word.front}</div>
                  <div className="translation">{word.back}</div>
                  <div className="word-progress">
                    <WordRing stage={word.stage} size={28} />
                    <span>шаг {word.stage} из 6</span>
                  </div>
                </div>
                <button
                  className="kill"
                  type="button"
                  aria-label="Удалить"
                  onClick={() => void run(async () => {
                    await langApi.deleteWord(word.id);
                    await openStudent(selectedId);
                  })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <form
            className="form task-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addTask();
            }}
          >
            <h2>Домашнее задание{selectedLesson ? ` к «${selectedLesson.title}»` : ''}</h2>
            {bundle.lessons.length === 0 ? (
              <p className="hint-line">Сначала создай урок. Задание пишется к нему.</p>
            ) : (
              <>
                <label>
                  Название
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Про аэропорт" />
                </label>
                <label>
                  Задание
                  <textarea
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    placeholder="Составь 5 предложений со словами урока"
                    rows={4}
                  />
                </label>
                <button className="btn primary" type="submit" disabled={busy || !lessonId}>
                  Оставить задание
                </button>
              </>
            )}
          </form>
          <div className="list">
            {lessonTasks.map((item) => (
              <article key={item.id} className={`task${item.checked ? ' is-checked' : ''}`}>
                <h2>{item.title}</h2>
                <p className="translation">{item.checked ? 'Проверено' : selectedLesson?.title}</p>
                <p>{item.task}</p>
                <div className="note-box">
                  <strong>Заметка ученика</strong>
                  <p>{item.answer || 'Пока пусто'}</p>
                </div>
                <label>
                  Комментарий к проверке
                  <textarea
                    value={reviews[item.id] ?? ''}
                    onChange={(event) => setReviews((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    placeholder="Что получилось и что поправить"
                    rows={3}
                  />
                </label>
                <button className="btn primary" type="button" disabled={busy} onClick={() => checkTask(item.id, !item.checked)}>
                  {item.checked ? 'Снять проверку' : 'Проверено'}
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      await langApi.deleteHomework(item.id);
                      await openStudent(selectedId);
                    })
                  }
                >
                  Удалить задание
                </button>
              </article>
            ))}
            {looseTasks.map((item) => (
              <article key={item.id} className={`task${item.checked ? ' is-checked' : ''}`}>
                <h2>{item.title}</h2>
                <p className="translation">Без урока{item.checked ? ' · проверено' : ''}</p>
                <p>{item.task}</p>
                <div className="note-box">
                  <strong>Заметка ученика</strong>
                  <p>{item.answer || 'Пока пусто'}</p>
                </div>
                <label>
                  Комментарий к проверке
                  <textarea
                    value={reviews[item.id] ?? ''}
                    onChange={(event) => setReviews((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    placeholder="Что получилось и что поправить"
                    rows={3}
                  />
                </label>
                <button className="btn primary" type="button" disabled={busy} onClick={() => checkTask(item.id, !item.checked)}>
                  {item.checked ? 'Снять проверку' : 'Проверено'}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
