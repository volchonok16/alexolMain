import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  budget: z.string().optional(),
  description: z.string().min(1),
  pageCount: z.number().optional(),
  calculatedPrice: z.number().optional(),
});
