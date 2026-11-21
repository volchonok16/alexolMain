import { z } from 'zod';

export const PORTFOLIO_CATEGORIES = ['Crypto', 'eCommerce', 'Enterprise', 'Automation'] as const;

const optionalLink = z
  .string()
  .trim()
  .optional()
  .transform(value => (value ? value : null))
  .refine(value => !value || /^https?:\/\/.+/i.test(value), 'Link must be a valid URL');

export const createPortfolioSchema = z.object({
  category: z.string().trim().min(1),
  titleRu: z.string().trim().min(1),
  titleEn: z.string().trim().min(1),
  descriptionRu: z.string().trim().min(1),
  descriptionEn: z.string().trim().min(1),
  resultRu: z.string().trim().min(1),
  resultEn: z.string().trim().min(1),
  link: optionalLink,
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updatePortfolioSchema = z.object({
  category: z.string().trim().min(1).optional(),
  titleRu: z.string().trim().min(1).optional(),
  titleEn: z.string().trim().min(1).optional(),
  descriptionRu: z.string().trim().min(1).optional(),
  descriptionEn: z.string().trim().min(1).optional(),
  resultRu: z.string().trim().min(1).optional(),
  resultEn: z.string().trim().min(1).optional(),
  link: optionalLink,
  sortOrder: z.coerce.number().int().min(0).optional(),
});
