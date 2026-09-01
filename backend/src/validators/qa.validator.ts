import { z } from 'zod';
import { QA_MAX_CHARS, QA_MIN_CHARS } from '../utils/qaText.js';

export const qaSettingsSchema = z.object({
  prompt: z.string().max(50_000, 'Промпт слишком длинный'),
  maxChars: z.coerce.number().int().min(QA_MIN_CHARS).max(QA_MAX_CHARS),
});

export const qaChatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1, 'Введите вопрос').max(4000, 'Слишком длинное сообщение'),
});

export const qaModeSchema = z.object({
  mode: z.enum(['ai', 'human']),
});

export const qaReplySchema = z.object({
  content: z.string().trim().min(1, 'Введите ответ').max(8000, 'Слишком длинный ответ'),
});
