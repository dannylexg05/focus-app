// types/settings.ts
export type ThemePreference = 'light' | 'dark' | 'system';

export interface AppSettings {
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themePreference: 'system',
  notificationsEnabled: true,
};
