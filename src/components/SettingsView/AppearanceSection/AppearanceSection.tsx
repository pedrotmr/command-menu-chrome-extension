import type { AppearanceMode } from '@/types';
import type { SettingsSectionProps } from '../types';
import { CheckGlyph } from '../CheckGlyph';

interface AppearanceOption {
  id: AppearanceMode;
  label: string;
  description: string;
}

const appearances: AppearanceOption[] = [
  { id: 'system', label: 'System', description: 'Follow your device' },
  { id: 'light', label: 'Light', description: 'Always light' },
  { id: 'dark', label: 'Dark', description: 'Always dark' },
];

export function AppearanceSection({ preferences, onChange }: SettingsSectionProps) {
  return (
    <fieldset className="settings-group">
      <legend>Color mode</legend>
      <div className="option-grid">
        {appearances.map((appearance) => {
          const active = preferences.appearance === appearance.id;

          return (
            <button
              key={appearance.id}
              type="button"
              className={`option-card${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange({ ...preferences, appearance: appearance.id })}
            >
              <span className="option-card-text">
                <span className="option-card-title">{appearance.label}</span>
                <span className="option-card-description">{appearance.description}</span>
              </span>
              {active && <CheckGlyph />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
