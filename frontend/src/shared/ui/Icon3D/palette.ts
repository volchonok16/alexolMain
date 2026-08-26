import type { Icon3DType } from './meshes';

export type ThemeName = 'dark' | 'light';

export type IconPalette = {
  primary: string;
  accent: string;
  glow: number;
  rim: number;
};

export const ICON_COLORS: Record<Icon3DType, Record<ThemeName, IconPalette>> = {
  web: {
    dark: { primary: '#0AE3FF', accent: '#F4FBFF', glow: 0x0ae3ff, rim: 0x7c8cff },
    light: { primary: '#06B6D4', accent: '#67E8F9', glow: 0x06b6d4, rim: 0x6366f1 },
  },
  cloud: {
    dark: { primary: '#5CE1FF', accent: '#D6F7FF', glow: 0x5ce1ff, rim: 0x60a5fa },
    light: { primary: '#0EA5E9', accent: '#7DD3FC', glow: 0x0ea5e9, rim: 0x3b82f6 },
  },
  enterprise: {
    dark: { primary: '#00C2E0', accent: '#7EF0FF', glow: 0x00c2e0, rim: 0x38bdf8 },
    light: { primary: '#14B8A6', accent: '#5EEAD4', glow: 0x14b8a6, rim: 0x0284c7 },
  },
  backend: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x818cf8 },
    light: { primary: '#3B82F6', accent: '#93C5FD', glow: 0x3b82f6, rim: 0x818cf8 },
  },
  ecommerce: {
    dark: { primary: '#2EE6C7', accent: '#C5FFF3', glow: 0x2ee6c7, rim: 0x22d3ee },
    light: { primary: '#2DD4BF', accent: '#99F6E4', glow: 0x2dd4bf, rim: 0x06b6d4 },
  },
  ai: {
    dark: { primary: '#8B9BFF', accent: '#0AE3FF', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: { primary: '#6366F1', accent: '#22D3EE', glow: 0x6366f1, rim: 0x06b6d4 },
  },
  frontend: {
    dark: { primary: '#00D4FF', accent: '#FFFFFF', glow: 0x00d4ff, rim: 0xa78bfa },
    light: { primary: '#0EA5E9', accent: '#A78BFA', glow: 0x0ea5e9, rim: 0x7c3aed },
  },
  mobile: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x67e8f9 },
    light: { primary: '#38BDF8', accent: '#7DD3FC', glow: 0x38bdf8, rim: 0x22d3ee },
  },
  automation: {
    dark: { primary: '#2EE6C7', accent: '#C5FFF3', glow: 0x2ee6c7, rim: 0x22d3ee },
    light: { primary: '#14B8A6', accent: '#5EEAD4', glow: 0x14b8a6, rim: 0x06b6d4 },
  },
  simplification: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x818cf8 },
    light: { primary: '#0EA5E9', accent: '#93C5FD', glow: 0x0ea5e9, rim: 0x6366f1 },
  },
  transparency: {
    dark: { primary: '#00D4FF', accent: '#FFFFFF', glow: 0x00d4ff, rim: 0x7c8cff },
    light: { primary: '#06B6D4', accent: '#67E8F9', glow: 0x06b6d4, rim: 0x3b82f6 },
  },
  reliability: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x38bdf8 },
    light: { primary: '#2563EB', accent: '#93C5FD', glow: 0x2563eb, rim: 0x0284c7 },
  },
  adaptation: {
    dark: { primary: '#8B9BFF', accent: '#0AE3FF', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: { primary: '#6366F1', accent: '#22D3EE', glow: 0x6366f1, rim: 0x06b6d4 },
  },
  efficiency: {
    dark: { primary: '#0AE3FF', accent: '#7EF0FF', glow: 0x0ae3ff, rim: 0x22d3ee },
    light: { primary: '#06B6D4', accent: '#5EEAD4', glow: 0x06b6d4, rim: 0x14b8a6 },
  },
  development: {
    dark: { primary: '#00D4FF', accent: '#E8F6FF', glow: 0x00d4ff, rim: 0xa78bfa },
    light: { primary: '#0EA5E9', accent: '#A78BFA', glow: 0x0ea5e9, rim: 0x7c3aed },
  },
  outsourcing: {
    dark: { primary: '#4DB8FF', accent: '#E8F6FF', glow: 0x4db8ff, rim: 0x818cf8 },
    light: { primary: '#0EA5E9', accent: '#93C5FD', glow: 0x0ea5e9, rim: 0x6366f1 },
  },
  design: {
    dark: { primary: '#8B9BFF', accent: '#C5FFF3', glow: 0x8b9bff, rim: 0x0ae3ff },
    light: { primary: '#6366F1', accent: '#5EEAD4', glow: 0x6366f1, rim: 0x06b6d4 },
  },
  support: {
    dark: { primary: '#3D9EFF', accent: '#B9DCFF', glow: 0x3d9eff, rim: 0x38bdf8 },
    light: { primary: '#2563EB', accent: '#93C5FD', glow: 0x2563eb, rim: 0x0284c7 },
  },
  consulting: {
    dark: { primary: '#00C2E0', accent: '#7EF0FF', glow: 0x00c2e0, rim: 0x38bdf8 },
    light: { primary: '#14B8A6', accent: '#5EEAD4', glow: 0x14b8a6, rim: 0x0284c7 },
  },
};
