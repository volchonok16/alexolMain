import { useEffect, useState } from 'react';
import type { RemoteHomework } from './langApi';

export function LessonTasks({
  items,
  onSave,
}: {
  items: RemoteHomework[];
  onSave: (id: string, answer: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.id] = item.answer;
    });
    setDrafts(next);
  }, [items]);

  const save = async (id: string) => {
    setSaving(id);
    setError('');
    try {
      await onSave(id, drafts[id] ?? '');
      setSaved(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить');
    } finally {
      setSaving(null);
    }
  };

  if (items.length === 0) return null;
  return (
    <div className="list">
      {error && <p className="hint-line">{error}</p>}
      {items.map((item) => (
        <article key={item.id} className={`task${item.checked ? ' is-checked' : ''}`}>
          <h2>{item.title}</h2>
          {item.checked && <p className="checked-label">Проверено</p>}
          <p>{item.task}</p>
          {item.review && (
            <div className="note-box">
              <strong>Комментарий</strong>
              <p>{item.review}</p>
            </div>
          )}
          <label className="answer-field">
            <span>Заметка или ответ</span>
            <textarea
              value={drafts[item.id] ?? ''}
              onChange={(event) => {
                setSaved(null);
                setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }));
              }}
              placeholder="Напиши ответ или заметку к заданию"
              rows={4}
            />
          </label>
          <button className="btn primary" type="button" onClick={() => save(item.id)} disabled={saving === item.id}>
            {saving === item.id ? 'Сохраняю…' : saved === item.id ? 'Сохранено' : 'Сохранить'}
          </button>
        </article>
      ))}
    </div>
  );
}
