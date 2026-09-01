export const QA_HISTORY_MS = 3 * 24 * 60 * 60 * 1000;
export const QA_MIN_CHARS = 100;
export const QA_MAX_CHARS = 4000;
export const QA_DEFAULT_CHARS = 1000;

export function charCount(text: string): number {
  return Array.from(text).length;
}

export function historySince(): Date {
  return new Date(Date.now() - QA_HISTORY_MS);
}

export function previewText(text: string, max = 120): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(trimmed);
  if (chars.length <= max) return trimmed;
  return `${chars.slice(0, max).join('').trimEnd()}…`;
}

/**
 * Keeps a complete thought inside the limit: last sentence (or last word) that fits.
 * Does not slice mid-word as the primary strategy.
 */
export function fitToMaxChars(text: string, maxChars: number): string {
  const normalized = text.replace(/\u0000/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (maxChars < 1) return '';
  const chars = Array.from(normalized);
  if (chars.length <= maxChars) return normalized;

  const sliced = chars.slice(0, maxChars).join('').trimEnd();
  const sentence = sliced.match(/^[\s\S]*[.!?…]/u);
  if (sentence) {
    const complete = sentence[0].trim();
    if (charCount(complete) >= Math.min(40, Math.floor(maxChars * 0.35))) {
      return complete;
    }
  }

  const lastBreak = Math.max(sliced.lastIndexOf(' '), sliced.lastIndexOf('\n'));
  if (lastBreak > Math.floor(maxChars * 0.45)) {
    return sliced.slice(0, lastBreak).trim();
  }

  return sliced.trim();
}

export function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export function extractOpenRouterText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown[] }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const message = (choices[0] as { message?: Record<string, unknown> })?.message || {};
  const raw = message.content;
  let text = '';
  if (typeof raw === 'string') {
    text = raw;
  } else if (Array.isArray(raw)) {
    text = raw
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text || '');
        }
        return '';
      })
      .join('');
  }
  if (!text.trim()) {
    text = String(message.reasoning || message.reasoning_content || '');
  }
  return stripThinkBlocks(text).replace(/\s+\n/g, '\n').trim();
}

export function buildSystemPrompt(companyPrompt: string, maxChars: number): string {
  const knowledge = companyPrompt.trim() || 'Описание компании пока не задано.';
  return [
    'Ты консультант компании. Отвечай только на основе описания компании и истории этого диалога.',
    'Не выдумывай факты, цены, сроки, гарантии и контакты, которых нет в описании.',
    'Если данных недостаточно — честно скажи об этом и предложи оставить заявку или написать на info@alexol.io.',
    `Жёсткий лимит ответа: не больше ${maxChars} символов, включая пробелы и знаки препинания.`,
    'Уложись в лимит и закончи мысль целиком: полные предложения, без обрыва на полуслове и без «обрезанного» хвоста.',
    'Пиши на языке вопроса клиента. Без markdown-заголовков, без списков из решёток.',
    '',
    'ОПИСАНИЕ КОМПАНИИ И УСЛУГ:',
    knowledge,
  ].join('\n');
}
