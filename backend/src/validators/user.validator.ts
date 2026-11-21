import { z } from 'zod';
import { ORG_ROLE_IDS, normalizeOrgRoles } from '../utils/orgRoles.js';

const optionalEmail = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().email().nullable().optional()
);

const optionalBirthDate = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().nullable().optional()
);

const optionalContact = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().nullable().optional()
);

const orgRolesField = z.preprocess(value => {
  if (value === undefined) return undefined;
  return normalizeOrgRoles(value);
}, z.array(z.enum(ORG_ROLE_IDS)).optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}, z.boolean().optional());

export const createUserSchema = z.object({
  login: z.string().trim().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'user']),
  email: optionalEmail,
  phone: optionalContact,
  jobTitle: optionalContact,
  telegram: optionalContact,
  birthDate: optionalBirthDate,
  orgRoles: orgRolesField,
  direction: optionalContact,
  isTechnical: optionalBoolean,
});

export const updateUserSchema = z.object({
  login: z.string().trim().min(3).optional(),
  password: z.preprocess(value => (value === '' ? undefined : value), z.string().min(6).optional()),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
  email: optionalEmail,
  phone: optionalContact,
  jobTitle: optionalContact,
  telegram: optionalContact,
  birthDate: optionalBirthDate,
  orgRoles: orgRolesField,
  direction: optionalContact,
  isTechnical: optionalBoolean,
});
