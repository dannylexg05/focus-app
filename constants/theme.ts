// constants/theme.ts
import { Priority } from '../types/task';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentText: string;
  danger: string;
  dangerBg: string;
  priority: Record<Priority, { color: string; bg: string; label: string }>;
  listPalette: string[];
}

const listPalette = [
  '#5E6AD2',
  '#EB5757',
  '#F2994A',
  '#27AE60',
  '#2F80ED',
  '#BB6BD9',
  '#56CCF2',
  '#9B9B7A',
];

export const lightTheme: AppTheme = {
  mode: 'light',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F5',
  border: '#EAEAE7',
  borderStrong: '#D9D9D6',
  textPrimary: '#19191A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9A97',
  accent: '#5E6AD2',
  accentText: '#FFFFFF',
  danger: '#EB5757',
  dangerBg: 'rgba(235,87,87,0.10)',
  priority: {
    high: { color: '#EB5757', bg: 'rgba(235,87,87,0.10)', label: 'Alta' },
    medium: { color: '#B96A1F', bg: 'rgba(242,153,74,0.14)', label: 'Media' },
    low: { color: '#1F8A4C', bg: 'rgba(39,174,96,0.12)', label: 'Baja' },
  },
  listPalette,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  bg: '#191919',
  surface: '#202020',
  surfaceAlt: '#252525',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: '#EDEDED',
  textSecondary: '#9B9B9B',
  textTertiary: '#6F6F6F',
  accent: '#7C8AFF',
  accentText: '#111111',
  danger: '#FF6B6B',
  dangerBg: 'rgba(255,107,107,0.14)',
  priority: {
    high: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.14)', label: 'Alta' },
    medium: { color: '#FFA94D', bg: 'rgba(255,169,77,0.14)', label: 'Media' },
    low: { color: '#51CF66', bg: 'rgba(81,207,102,0.14)', label: 'Baja' },
  },
  listPalette,
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
