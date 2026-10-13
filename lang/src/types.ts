export type LangId = 'en' | 'es' | 'fr' | 'de';
export type DeckTheme = 'basics' | 'travel' | 'food' | 'custom' | 'tutor';
export type QuizMode = 'ask' | 'study';

export type Card = {
  id: string;
  lang: LangId;
  deck: DeckTheme;
  front: string;
  back: string;
  example?: string;
  image?: string;
  lessonId?: string;
  source: 'starter' | 'custom' | 'assigned';
  createdAt: number;
};

export type CardProgress = {
  known: number;
  unknown: number;
  lastSeen: number;
  /** 0 = новое, 1–5 = изучаю, 6 = знаю. Шесть кружков, как в словаре Skyeng. */
  stage: number;
  inStudy: boolean;
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
