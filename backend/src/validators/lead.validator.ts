import { z } from 'zod';

export const updateLeadSchema = z.object({
  status: z.enum(['new', 'in_progress', 'closed']),
});
