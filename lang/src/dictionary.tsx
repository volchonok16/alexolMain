import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Users } from 'lucide-react';
import { DECKS, deckById, langById } from './data';
import { STAGE_MAX, scaleCaption, scaleFromStages, stageColor, stageLabel, studyBucket, type Scale } from './progress';
import type { Store } from './storage';
import type { Card, DeckTheme, LangId } from './types';

export type DictFilter = 'all' | 'picked' | 'fresh' | 'learning' | 'known';

const FILTERS: { id: DictFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'picked', label: 'К изучению' },
  { id: 'fresh', label: 'Новые' },
  { id: 'learning', label: 'Изучаю' },
  { id: 'known', label: 'Знаю' },
];

export function StageRing({
  ratio,
  label,
  color,
  size = 36,
}: {
  ratio: number;
  label: string;
  color: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const radius = 15.5;
  const length = 2 * Math.PI * radius;
  return (
    <span className="stage-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="track" cx="18" cy="18" r={radius} />
        <circle
          className="fill"
          cx="18"
          cy="18"
          r={radius}
          stroke={color}
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - clamped)}
        />
      </svg>
      <b style={{ color, fontSize: Math.max(8, Math.round(size * (label.length > 2 ? 0.2 : 0.26))) }}>
        {label}
      </b>
    </span>
  );
}

export function WordRing({ stage, size = 34 }: { stage: number; size?: number }) {
  const value = Math.max(0, Math.min(STAGE_MAX, Math.round(stage)));
  return (
    <StageRing
      ratio={value / STAGE_MAX}
      label={String(value)}
      color={stageColor(value)}
      size={size}
    />
  );
}

export function StageDots({ stage, size = 'sm' }: { stage: number; size?: 'sm' | 'lg' }) {
  const color = stageColor(stage);
  return (
    <span className={`stage-dots is-${size}`} aria-label={`${stageLabel(stage)}, ${stage} из ${STAGE_MAX}`}>
      {Array.from({ length: STAGE_MAX }, (_, index) => (
        <i
          key={index}
          className={index < stage ? 'is-on' : ''}
          style={index < stage ? { background: color, borderColor: color } : undefined}
        />
      ))}
    </span>
  );
}

function LessonScales({
  store,
  lang,
  lessons,
}: {
  store: Store;
  lang: LangId;
  lessons: { id: string; title: string }[];
}) {
  const rows = useMemo(() => {
    const items: { id: string; title: string; scale: Scale }[] = [];
    lessons.forEach((lesson) => {
      const stages = store.cards
        .filter((card) => card.lang === lang && card.lessonId === lesson.id)
        .map((card) => store.progress[card.id]?.stage ?? 0);
      if (stages.length === 0) return;
      items.push({ id: lesson.id, title: lesson.title, scale: scaleFromStages(stages) });
    });
    const own = store.cards
      .filter((card) => card.lang === lang && card.deck === 'custom')
      .map((card) => store.progress[card.id]?.stage ?? 0);
    if (own.length) items.push({ id: 'custom', title: 'Мои слова', scale: scaleFromStages(own) });
    return items.sort((a, b) => Number(a.scale.known === a.scale.total && a.scale.total > 0) - Number(b.scale.known === b.scale.total && b.scale.total > 0));
  }, [store.cards, store.progress, lang, lessons]);

  if (rows.length === 0) return null;
  return (
    <div className="lesson-scales">
      {rows.map((row) => {
        const done = row.scale.total > 0 && row.scale.known === row.scale.total;
        return (
          <div key={row.id} className={`lesson-scale${done ? ' is-done' : ''}`}>
            <StageRing
              ratio={row.scale.ratio}
              label={`${row.scale.percent}%`}
              color={done ? '#3ee0a3' : stageColor(Math.round(row.scale.ratio * STAGE_MAX))}
              size={44}
            />
            <div>
              <strong>{row.title}</strong>
              <span>{done ? `Пройден · ${scaleCaption(row.scale)}` : scaleCaption(row.scale)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function matchesFilter(card: Card, store: Store, filter: DictFilter): boolean {
  const progress = store.progress[card.id];
  const inStudy = Boolean(progress?.inStudy);
  if (filter === 'all') return true;
  if (filter === 'picked') return inStudy;
  if (!inStudy) return false;
  return studyBucket(progress?.stage ?? 0) === filter;
}

export function DictionaryScreen({
  store,
  lang,
  onBack,
  onToggle,
  onAddDeck,
  onTrain,
  onAsk,
  onAddWord,
  lessons,
}: {
  store: Store;
  lang: LangId;
  onBack: () => void;
  onToggle: (id: string, on: boolean) => void;
  onAddDeck: (ids: string[]) => void;
  onTrain: () => void;
  onAsk: () => void;
  onAddWord: () => void;
  lessons: { id: string; title: string }[];
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DictFilter>('all');
  const [deck, setDeck] = useState<DeckTheme | 'all'>('all');
  const meta = langById(lang);

  const langCards = useMemo(
    () => store.cards.filter((card) => card.lang === lang),
    [store.cards, lang],
  );

  const stats = useMemo(() => {
    const stages = langCards
      .filter((card) => store.progress[card.id]?.inStudy)
      .map((card) => store.progress[card.id]?.stage ?? 0);
    return scaleFromStages(stages);
  }, [langCards, store.progress]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return langCards.filter((card) => {
      if (deck !== 'all' && card.deck !== deck) return false;
      if (!matchesFilter(card, store, filter)) return false;
      if (!needle) return true;
      return card.front.toLowerCase().includes(needle) || card.back.toLowerCase().includes(needle);
    });
  }, [langCards, store, deck, filter, query]);

  const missingInDeck = useMemo(() => {
    if (deck === 'all') return [];
    return langCards.filter((card) => card.deck === deck && !store.progress[card.id]?.inStudy).map((card) => card.id);
  }, [deck, langCards, store.progress]);

  return (
    <>
      <header className="top">
        <button className="back-btn" type="button" onClick={onBack} aria-label="Назад">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Слова к изучению</h1>
          <p>{meta?.name ?? ''} · отметь, что учить</p>
        </div>
      </header>

      <section className="dict-head">
        <div className="dict-head-row">
          <StageRing ratio={stats.ratio} label={`${stats.percent}%`} color={stageColor(Math.round(stats.ratio * STAGE_MAX))} size={52} />
          <span>
            {stats.total === 0
              ? 'Словарь пуст — включи слова ниже'
              : `${stats.known} знаю · ${stats.learning} изучаю · ${stats.fresh} новых`}
          </span>
        </div>
        <div className="dict-bar" aria-hidden="true">
          <i style={{ width: `${stats.percent}%` }} />
        </div>
        <p className="dict-note">Кружок заполняется по шагам. «Помню» добавляет один, «Не помню» чуть снимает.</p>
      </section>
      <LessonScales store={store} lang={lang} lessons={lessons} />

      <div className="dict-actions">
        <button className="btn primary" type="button" onClick={onTrain} disabled={stats.total === 0}>
          <BookOpen size={16} /> Учить слова{stats.total ? ` · ${stats.total}` : ''}
        </button>
        <button className="btn ghost" type="button" onClick={onAsk} disabled={stats.total === 0}>
          <Users size={16} /> Спросить друга
        </button>
      </div>

      <label className="dict-search">
        Найти
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="hello или привет"
          autoCapitalize="none"
        />
      </label>

      <div className="filters" role="tablist" aria-label="Статус">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            className={`chip${filter === item.id ? ' is-active' : ''}`}
            type="button"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="filters" aria-label="Набор">
        <button
          className={`chip${deck === 'all' ? ' is-active' : ''}`}
          type="button"
          onClick={() => setDeck('all')}
        >
          Все темы
        </button>
        {DECKS.map((item) => (
          <button
            key={item.id}
            className={`chip${deck === item.id ? ' is-active' : ''}`}
            type="button"
            onClick={() => setDeck(item.id)}
          >
            {item.emoji} {item.title}
          </button>
        ))}
      </div>

      {deck !== 'all' && missingInDeck.length > 0 && (
        <button className="btn ghost deck-add" type="button" onClick={() => onAddDeck(missingInDeck)}>
          Добавить «{deckById(deck)?.title ?? 'набор'}» в словарь · {missingInDeck.length}
        </button>
      )}

      <button className="mode dict-add" type="button" onClick={onAddWord}>
        <span className="icon-wrap">
          <Plus size={18} />
        </span>
        <span>
          <strong>Своё слово</strong>
          <span>Попадёт в словарь сразу и станет карточкой.</span>
        </span>
      </button>

      {visible.length === 0 ? (
        <p className="empty">
          {filter === 'all'
            ? 'Ничего не нашлось. Смени тему или добавь своё слово.'
            : 'В этом статусе пока пусто. Включи «Учить» у нужных слов.'}
        </p>
      ) : (
        <div className="list">
          {visible.map((card) => {
            const progress = store.progress[card.id];
            const inStudy = Boolean(progress?.inStudy);
            const stage = progress?.stage ?? 0;
            return (
              <div key={card.id} className={`word${inStudy ? ' is-study' : ''}`}>
                {card.image && <img className="word-photo" src={card.image} alt="" />}
                <div className="word-main">
                  <div className="front">{card.front}</div>
                  <div className="translation">{card.back}</div>
                  {inStudy && (
                    <div className="word-progress">
                      <WordRing stage={stage} />
                      <span style={{ color: stageColor(stage) }}>{stageLabel(stage)}</span>
                    </div>
                  )}
                </div>
                <button
                  className={`study-switch${inStudy ? ' is-on' : ''}`}
                  type="button"
                  aria-pressed={inStudy}
                  onClick={() => onToggle(card.id, !inStudy)}
                >
                  {inStudy ? 'Учу' : 'Учить'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
