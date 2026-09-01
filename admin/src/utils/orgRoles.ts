export const ORG_ROLE_OPTIONS = [
  { id: 'manager', label: 'Руководитель' },
  { id: 'mentor', label: 'Наставник' },
  { id: 'employee', label: 'Сотрудник' },
  { id: 'student', label: 'Обучающийся' },
] as const;

export type OrgRoleId = (typeof ORG_ROLE_OPTIONS)[number]['id'];

const KNOWN = new Set<string>(ORG_ROLE_OPTIONS.map(item => item.id));

export function normalizeOrgRoles(value: unknown): OrgRoleId[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string' && value.trim()) {
    const text = value.trim();
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        raw = Array.isArray(parsed) ? parsed : [];
      } catch {
        raw = text.split(',');
      }
    } else {
      raw = text.split(',');
    }
  }
  const seen = new Set<OrgRoleId>();
  for (const item of raw) {
    const key = String(item || '')
      .trim()
      .toLowerCase();
    if (KNOWN.has(key)) seen.add(key as OrgRoleId);
  }
  return ORG_ROLE_OPTIONS.map(item => item.id).filter(id => seen.has(id));
}

export function orgRoleLabels(roles: unknown): string[] {
  const set = new Set(normalizeOrgRoles(roles));
  return ORG_ROLE_OPTIONS.filter(item => set.has(item.id)).map(item => item.label);
}

export function toggleOrgRole(roles: string[], id: OrgRoleId): OrgRoleId[] {
  const set = new Set(normalizeOrgRoles(roles));
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return ORG_ROLE_OPTIONS.map(item => item.id).filter(key => set.has(key));
}
