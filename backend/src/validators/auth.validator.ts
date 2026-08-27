import { z } from 'zod';

export const loginSchema = z.object({
  // Login username or email
  login: z.string().trim().min(1),
  password: z.string().min(1),
});
