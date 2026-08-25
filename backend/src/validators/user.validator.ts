import { z } from 'zod';

export const createUserSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'user']),
  birthDate: z.string().min(1),
});

export const updateUserSchema = z.object({
  login: z.string().min(3).optional(),
  password: z.preprocess(value => (value === '' ? undefined : value), z.string().min(6).optional()),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
  birthDate: z.string().min(1).optional(),
});
