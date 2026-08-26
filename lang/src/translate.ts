import type { LangId } from './types';

const CACHE = new Map<string, string[]>();

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

/** Подсказки перевода RU через MyMemory (только онлайн). */
export async function suggestRuTranslations(
  text: string,
  from: LangId,
  signal?: AbortSignal,
): Promise<string[]> {
  const query = text.trim();
  if (!query || !navigator.onLine) return [];

  const cacheKey = `${from}:${query.toLowerCase()}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(query)}` +
    `&langpair=${from}|ru`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`translate ${response.status}`);

  const data = (await response.json()) as {
    responseData?: { translatedText?: string };
    matches?: Array<{ translation?: string; match?: number }>;
  };

  const primary = data.responseData?.translatedText ?? '';
  const matches = (data.matches ?? [])
    .slice()
    .sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
    .map((item) => item.translation ?? '');

  const suggestions = uniq([primary, ...matches])
    .filter((item) => item.toLowerCase() !== query.toLowerCase())
    .slice(0, 5);

  if (suggestions.length) CACHE.set(cacheKey, suggestions);
  return suggestions;
}
