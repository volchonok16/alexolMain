export const ORG_ROLE_IDS = ['manager', 'mentor', 'employee', 'student'] as const;

export type OrgRoleId = (typeof ORG_ROLE_IDS)[number];

const KNOWN = new Set<string>(ORG_ROLE_IDS);

export function normalizeOrgRoles(value: unknown): OrgRoleId[] {
  let raw: unknown[] = [];
  if (value == null || value === '') {
    raw = [];
  } else if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      raw = [];
    } else if (text.startsWith('[')) {
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
  return ORG_ROLE_IDS.filter(id => seen.has(id));
}

export function dumpOrgRoles(value: unknown): string | null {
  const cleaned = normalizeOrgRoles(value);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}
