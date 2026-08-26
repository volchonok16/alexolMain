export type LangId = 'en' | 'es' | 'fr' | 'de';
export type DeckTheme = 'basics' | 'travel' | 'food' | 'custom';
export type QuizMode = 'ask' | 'study';

export type Card = {
  id: string;
  lang: LangId;
  deck: DeckTheme;
  front: string;
  back: string;
  example?: string;
  source: 'starter' | 'custom';
  createdAt: number;
};

export type CardProgress = {
  known: number;
  unknown: number;
  lastSeen: number;
};

export type LangMeta = {
  id: LangId;
  flag: string;
  name: string;
  nameRu: string;
};

export type DeckMeta = {
  id: DeckTheme;
  emoji: string;
  title: string;
  hint: string;
};
