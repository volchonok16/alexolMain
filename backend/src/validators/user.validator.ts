import { z } from 'zod';

const optionalEmail = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().email().nullable().optional()
);

const optionalBirthDate = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().nullable().optional()
);

export const createUserSchema = z.object({
  login: z.string().trim().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'user']),
  email: optionalEmail,
  birthDate: optionalBirthDate,
});

export const updateUserSchema = z.object({
  login: z.string().trim().min(3).optional(),
  password: z.preprocess(value => (value === '' ? undefined : value), z.string().min(6).optional()),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
  email: optionalEmail,
  birthDate: optionalBirthDate,
});
