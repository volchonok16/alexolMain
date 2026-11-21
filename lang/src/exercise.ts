export type ExerciseKind = 'recall' | 'write' | 'order' | 'listen' | 'speak';

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»“”"'`]/g, '')
    .replace(/[.,!?;:…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answerVariants(expected: string): string[] {
  const parts = expected
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [expected.trim()];
}

export function answersMatch(input: string, expected: string): boolean {
  const got = normalizeAnswer(input);
  if (!got) return false;
  return answerVariants(expected).some((variant) => normalizeAnswer(variant) === got);
}

export function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function canOrder(text: string): boolean {
  if (text.includes('/')) return false;
  return tokenize(text).length >= 2;
}

export function shuffleIndexes(length: number): number[] {
  const next = Array.from({ length }, (_, index) => index);
  if (length < 2) return next;
  const original = next.join(',');
  let guard = 0;
  do {
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = next[i];
      next[i] = next[j];
      next[j] = swap;
    }
    guard += 1;
  } while (guard < 8 && next.join(',') === original);
  return next;
}

export function pickKind(answer: string, speak: boolean, listen: boolean): ExerciseKind {
  if (canOrder(answer) && Math.random() < 0.5) return 'order';
  const pool: ExerciseKind[] = ['recall', 'write'];
  if (speak) pool.push('speak');
  if (listen) pool.push('listen');
  return pool[Math.floor(Math.random() * pool.length)] ?? 'write';
}
