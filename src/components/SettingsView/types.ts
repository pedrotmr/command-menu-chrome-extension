import type { ThemePreferences } from '@/types';

export interface SettingsSectionProps {
  preferences: ThemePreferences;
  onChange: (preferences: ThemePreferences) => void;
}
