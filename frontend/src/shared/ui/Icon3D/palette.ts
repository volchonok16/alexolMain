import type { Icon3DType } from './meshes';

export type ThemeName = 'dark' | 'light';

export type IconPalette = {
  primary: string;
  accent: string;
  glow: number;
  rim: number;
};

/** Light theme families — aligned with site tokens (#0891B2, #0369A1, #06B6D4) */
const L = {
  cyan: {
    primary: '#0891B2',
    accent: '#FFFFFF',
    glow: 0x0891b2,
    rim: 0x0369a1,
  },
  sky: {
    primary: '#0284C7',
    accent: '#F0F9FF',
    glow: 0x0284c7,
    rim: 0x0369a1,
  },
  deep: {
    primary: '#0369A1',
    accent: '#E0F2FE',
    glow: 0x0369a1,
    rim: 0x075985,
  },
  teal: {
    primary: '#0D9488',
    accent: '#FFFFFF',
    glow: 0x0d9488,
    rim: 0x0891b2,
  },
  indigo: {
    primary: '#4F46E5',
    accent: '#FFFFFF',
    glow: 0x4f46e5,
    rim: 0x0891b2,
  },
  mint: {
    primary: '#059669',
    accent: '#ECFDF5',
    glow: 0x059669,
    rim: 0x0891b2,
  },
  whatsapp: {
    primary: '#128C7E',
    accent: '#FFFFFF',
    glow: 0x128c7e,
    rim: 0x075e54,
  },
  telegram: {
    primary: '#0088CC',
    accent: '#FFFFFF',
    glow: 0x0088cc,
    rim: 0x0369a1,
  },
} as const satisfies Record<string, IconPalette>;

export const ICON_COLORS: Record<Icon3DType, Record<ThemeName, IconPalette>> = {
  web: {
    dark: { primary: '#0AE3FF', accent: '#F4FBFF', glow: 0x0ae3ff, rim: 0x7c8cff },
    light: L.cyan,
  },
  cloud: {
    dark: { primary: '#5CE1FF', accent: '#D6F7FF', glow: 0x5ce1ff, rim: 0x60a5fa },
    light: L.sky,
  },
  enterprise: {
    dark: { primary: '#00C2E0', accent: '#7EF0FF', glow: 0x00c2e0, rim: 0x38bdf8 },
    light: L.teal,
  },
  backend: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x818cf8 },
    light: L.deep,
  },
  ecommerce: {
    dark: { primary: '#2EE6C7', accent: '#C5FFF3', glow: 0x2ee6c7, rim: 0x22d3ee },
    light: L.teal,
  },
  ai: {
    dark: { primary: '#8B9BFF', accent: '#0AE3FF', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: L.indigo,
  },
  frontend: {
    dark: { primary: '#00D4FF', accent: '#FFFFFF', glow: 0x00d4ff, rim: 0xa78bfa },
    light: L.cyan,
  },
  mobile: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x67e8f9 },
    light: L.sky,
  },
  automation: {
    dark: { primary: '#2EE6C7', accent: '#C5FFF3', glow: 0x2ee6c7, rim: 0x22d3ee },
    light: L.mint,
  },
  simplification: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x818cf8 },
    light: L.cyan,
  },
  transparency: {
    dark: { primary: '#00D4FF', accent: '#FFFFFF', glow: 0x00d4ff, rim: 0x7c8cff },
    light: L.cyan,
  },
  reliability: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x38bdf8 },
    light: L.deep,
  },
  adaptation: {
    dark: { primary: '#8B9BFF', accent: '#0AE3FF', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: L.indigo,
  },
  efficiency: {
    dark: { primary: '#0AE3FF', accent: '#7EF0FF', glow: 0x0ae3ff, rim: 0x22d3ee },
    light: L.cyan,
  },
  development: {
    dark: { primary: '#00D4FF', accent: '#E8F6FF', glow: 0x00d4ff, rim: 0xa78bfa },
    light: L.sky,
  },
  outsourcing: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x818cf8 },
    light: L.cyan,
  },
  design: {
    dark: { primary: '#8B9BFF', accent: '#C5FFF3', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: L.indigo,
  },
  support: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x38bdf8 },
    light: L.deep,
  },
  consulting: {
    dark: { primary: '#00C2E0', accent: '#7EF0FF', glow: 0x00c2e0, rim: 0x38bdf8 },
    light: L.teal,
  },
  functionality: {
    dark: { primary: '#0AE3FF', accent: '#7EF0FF', glow: 0x0ae3ff, rim: 0x22d3ee },
    light: L.cyan,
  },
  architecture: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x818cf8 },
    light: L.deep,
  },
  platforms: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x67e8f9 },
    light: L.sky,
  },
  integrations: {
    dark: { primary: '#2EE6C7', accent: '#C5FFF3', glow: 0x2ee6c7, rim: 0x22d3ee },
    light: L.mint,
  },
  clock: {
    dark: { primary: '#00D4FF', accent: '#FFFFFF', glow: 0x00d4ff, rim: 0xa78bfa },
    light: L.cyan,
  },
  scale: {
    dark: { primary: '#0AE3FF', accent: '#7EF0FF', glow: 0x0ae3ff, rim: 0x22d3ee },
    light: L.teal,
  },
  headphones: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x38bdf8 },
    light: L.deep,
  },
  mail: {
    dark: { primary: '#00D4FF', accent: '#E8F6FF', glow: 0x00d4ff, rim: 0x7c8cff },
    light: L.cyan,
  },
  phone: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x818cf8 },
    light: L.sky,
  },
  whatsapp: {
    dark: { primary: '#25D366', accent: '#FFFFFF', glow: 0x25d366, rim: 0x128c7e },
    light: L.whatsapp,
  },
  message: {
    dark: { primary: '#0AE3FF', accent: '#FFFFFF', glow: 0x0ae3ff, rim: 0x3d9eff },
    light: L.cyan,
  },
  telegram: {
    dark: { primary: '#2AABEE', accent: '#FFFFFF', glow: 0x2aabee, rim: 0x0088cc },
    light: L.telegram,
  },
  estimation: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x818cf8 },
    light: L.sky,
  },
  contract: {
    dark: { primary: '#00D4FF', accent: '#FFFFFF', glow: 0x00d4ff, rim: 0xa78bfa },
    light: L.cyan,
  },
  requirements: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x38bdf8 },
    light: L.deep,
  },
  testing: {
    dark: { primary: '#8B9BFF', accent: '#0AE3FF', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: L.indigo,
  },
  launch: {
    dark: { primary: '#0AE3FF', accent: '#7EF0FF', glow: 0x0ae3ff, rim: 0x22d3ee },
    light: L.cyan,
  },
};
