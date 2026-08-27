import { starterCards } from './data';
import type { Card, CardProgress, DeckTheme, LangId } from './types';

const STORAGE_KEY = 'alexol-lang-v1';

export type Store = {
  cards: Card[];
  progress: Record<string, CardProgress>;
  lastLang: LangId | null;
};

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
    const custom = Array.isArray(parsed.cards)
      ? parsed.cards.filter((card) => card && card.source === 'custom')
      : [];
    return {
      cards: [...starter, ...custom],
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      lastLang: parsed.lastLang ?? null,
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  const payload: Store = {
    cards: store.cards.filter((card) => card.source === 'custom'),
    progress: store.progress,
    lastLang: store.lastLang,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function cardsFor(store: Store, lang: LangId, deck: DeckTheme): Card[] {
  return store.cards.filter((card) => card.lang === lang && card.deck === deck);
}

export function addCustomCard(
  store: Store,
  input: { lang: LangId; front: string; back: string; example?: string },
): Store {
  const card: Card = {
    id: `custom:${input.lang}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    lang: input.lang,
    deck: 'custom',
    front: input.front.trim(),
    back: input.back.trim(),
    example: input.example?.trim() || undefined,
    source: 'custom',
    createdAt: Date.now(),
  };
  const next = { ...store, cards: [...store.cards, card] };
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
  const next = {
    ...store,
    cards: store.cards.filter((card) => card.id !== id),
  };
  delete next.progress[id];
  saveStore(next);
  return next;
}

export function markCard(store: Store, id: string, known: boolean): Store {
  const prev = store.progress[id] ?? { known: 0, unknown: 0, lastSeen: 0 };
  const next = {
    ...store,
    progress: {
      ...store.progress,
      [id]: {
        known: prev.known + (known ? 1 : 0),
        unknown: prev.unknown + (known ? 0 : 1),
        lastSeen: Date.now(),
      },
    },
  };
  saveStore(next);
  return next;
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
