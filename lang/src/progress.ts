export const STAGE_MAX = 6;

const STAGE_COLOR = ['#8b93a7', '#ff5d73', '#ff8a3d', '#ffc14d', '#d4e15a', '#69d98a', '#3ee0a3'];

export function clampStage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(STAGE_MAX, Math.round(value)));
}

export function nextStage(stage: number, known: boolean): number {
  const current = clampStage(stage);
  return known ? Math.min(STAGE_MAX, current + 1) : Math.max(0, current - 1);
}

export function stageLabel(stage: number): string {
  const value = clampStage(stage);
  if (value <= 0) return 'Новое';
  if (value >= STAGE_MAX) return 'Знаю';
  return 'Изучаю';
}

export function stageColor(stage: number): string {
  return STAGE_COLOR[clampStage(stage)] ?? STAGE_COLOR[0];
}

export type StudyBucket = 'fresh' | 'learning' | 'known';

export function studyBucket(stage: number): StudyBucket {
  const value = clampStage(stage);
  if (value >= STAGE_MAX) return 'known';
  if (value <= 0) return 'fresh';
  return 'learning';
}

export type Scale = {
  fresh: number;
  learning: number;
  known: number;
  total: number;
  ratio: number;
  percent: number;
};

export function scaleFromStages(stages: number[]): Scale {
  let fresh = 0;
  let learning = 0;
  let known = 0;
  let points = 0;
  stages.forEach((stage) => {
    const value = clampStage(stage);
    points += value;
    const bucket = studyBucket(value);
    if (bucket === 'known') known += 1;
    else if (bucket === 'fresh') fresh += 1;
    else learning += 1;
  });
  const total = stages.length;
  const ratio = total ? points / (total * STAGE_MAX) : 0;
  const percent = ratio === 0 ? 0 : Math.max(1, Math.round(ratio * 100));
  return { fresh, learning, known, total, ratio, percent };
}

export function scaleCaption(scale: Scale): string {
  if (scale.total === 0) return 'Пока нет слов';
  return `${scale.known} знаю · ${scale.learning} изучаю · ${scale.fresh} новых`;
}
