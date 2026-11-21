import { starterCards } from './data';
import type { RemoteWord } from './langApi';
import { clampStage, nextStage } from './progress';
import type { Card, CardProgress, DeckTheme, LangId } from './types';

const STORAGE_KEY = 'alexol-lang-v1';

export type Store = {
  cards: Card[];
  progress: Record<string, CardProgress>;
  lastLang: LangId | null;
};

function emptyProgress(): CardProgress {
  return { known: 0, unknown: 0, lastSeen: 0, stage: 0, inStudy: false };
}

function normalizeProgress(raw: unknown): Record<string, CardProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, CardProgress> = {};
  Object.entries(raw as Record<string, Partial<CardProgress>>).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') return;
    out[id] = {
      known: Number(value.known) || 0,
      unknown: Number(value.unknown) || 0,
      lastSeen: Number(value.lastSeen) || 0,
      stage: clampStage(Number(value.stage) || 0),
      inStudy: Boolean(value.inStudy),
    };
  });
  return out;
}

function emptyStore(): Store {
  return {
    cards: starterCards(),
    progress: {},
    lastLang: null,
  };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const starter = starterCards();
    const saved = Array.isArray(parsed.cards)
      ? parsed.cards.filter((card) => card && (card.source === 'custom' || card.source === 'assigned'))
      : [];
    return {
      cards: [...starter, ...saved],
      progress: normalizeProgress(parsed.progress),
      lastLang: parsed.lastLang ?? null,
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  const persisted = store.cards.filter((card) => card.source === 'custom' || card.source === 'assigned');
  const write = (cards: Card[]) => {
    const payload: Store = { cards, progress: store.progress, lastLang: store.lastLang };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };
  try {
    write(persisted);
  } catch {
    write(persisted.map((card) => ({ ...card, image: undefined })));
  }
}

export function cardsFor(store: Store, lang: LangId, deck: DeckTheme): Card[] {
  return store.cards.filter((card) => card.lang === lang && card.deck === deck);
}

function isLangId(value: string): value is LangId {
  return value === 'en' || value === 'es' || value === 'fr' || value === 'de';
}

export function applyAssigned(store: Store, words: RemoteWord[]): Store {
  const kept = store.cards.filter((card) => card.source !== 'assigned');
  const progress = { ...store.progress };
  const assigned: Card[] = [];
  words.forEach((word) => {
    if (!isLangId(word.lang)) return;
    const card: Card = {
      id: `assigned:${word.id}`,
      lang: word.lang,
      deck: 'tutor',
      lessonId: word.lessonId || undefined,
      front: word.front,
      back: word.back,
      example: word.example || undefined,
      image: word.image || undefined,
      source: 'assigned',
      createdAt: Date.parse(word.createdAt) || Date.now(),
    };
    assigned.push(card);
    const prev = progress[card.id];
    progress[card.id] = {
      known: word.known ?? prev?.known ?? 0,
      unknown: word.unknown ?? prev?.unknown ?? 0,
      lastSeen: prev?.lastSeen ?? 0,
      stage: word.stage ?? prev?.stage ?? 0,
      inStudy: true,
    };
  });
  const next = { ...store, cards: [...kept, ...assigned], progress };
  saveStore(next);
  return next;
}

export function addCustomCard(
  store: Store,
  input: { lang: LangId; front: string; back: string; example?: string; image?: string },
): Store {
  const card: Card = {
    id: `custom:${input.lang}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    lang: input.lang,
    deck: 'custom',
    front: input.front.trim(),
    back: input.back.trim(),
    example: input.example?.trim() || undefined,
    image: input.image,
    source: 'custom',
    createdAt: Date.now(),
  };
  const next = {
    ...store,
    cards: [...store.cards, card],
    progress: {
      ...store.progress,
      [card.id]: { ...emptyProgress(), inStudy: true },
    },
  };
  saveStore(next);
  return next;
}

export function updateCustomCard(
  store: Store,
  id: string,
  patch: { front: string; back: string; example?: string },
): Store {
  const next = {
    ...store,
    cards: store.cards.map((card) =>
      card.id === id && card.source === 'custom'
        ? {
            ...card,
            front: patch.front.trim(),
            back: patch.back.trim(),
            example: patch.example?.trim() || undefined,
          }
        : card,
    ),
  };
  saveStore(next);
  return next;
}

export function removeCustomCard(store: Store, id: string): Store {
  const progress = { ...store.progress };
  delete progress[id];
  const next = {
    ...store,
    cards: store.cards.filter((card) => card.id !== id),
    progress,
  };
  saveStore(next);
  return next;
}

export function markCard(store: Store, id: string, known: boolean): Store {
  const prev = store.progress[id] ?? emptyProgress();
  const next = {
    ...store,
    progress: {
      ...store.progress,
      [id]: {
        known: prev.known + (known ? 1 : 0),
        unknown: prev.unknown + (known ? 0 : 1),
        lastSeen: Date.now(),
        stage: prev.inStudy ? nextStage(prev.stage, known) : prev.stage,
        inStudy: prev.inStudy,
      },
    },
  };
  saveStore(next);
  return next;
}

export function setInStudy(store: Store, id: string, on: boolean): Store {
  const prev = store.progress[id] ?? emptyProgress();
  const next = {
    ...store,
    progress: {
      ...store.progress,
      [id]: { ...prev, inStudy: on },
    },
  };
  saveStore(next);
  return next;
}

export function setCardsInStudy(store: Store, ids: string[], on: boolean): Store {
  const progress = { ...store.progress };
  ids.forEach((id) => {
    const prev = progress[id] ?? emptyProgress();
    progress[id] = { ...prev, inStudy: on };
  });
  const next = { ...store, progress };
  saveStore(next);
  return next;
}

export function studyCards(store: Store, lang: LangId): Card[] {
  return store.cards.filter((card) => card.lang === lang && store.progress[card.id]?.inStudy);
}

export function studyQueue(cards: Card[], progress: Record<string, CardProgress>): Card[] {
  return cards
    .map((card) => ({ card, score: (progress[card.id]?.stage ?? 0) * 10 + Math.random() }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.card);
}

export function setLastLang(store: Store, lang: LangId): Store {
  const next = { ...store, lastLang: lang };
  saveStore(next);
  return next;
}

export function shuffleWeighted(cards: Card[], progress: Record<string, CardProgress>): Card[] {
  const scored = cards.map((card) => {
    const stats = progress[card.id];
    const unknownBias = stats ? stats.unknown - stats.known : 1;
    const jitter = Math.random();
    return { card, score: unknownBias + jitter };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.card);
}
