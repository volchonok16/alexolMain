import { z } from 'zod';

export const createNewsSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
});

export const updateNewsSchema = z.object({
  title: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
});
