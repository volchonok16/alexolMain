import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().min(1),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});
