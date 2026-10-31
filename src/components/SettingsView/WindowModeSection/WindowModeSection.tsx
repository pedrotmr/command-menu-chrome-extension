import type { SettingsSectionProps } from '../types';
import { CheckGlyph } from '../CheckGlyph';

const windowModes = [
  { id: 'compact', label: 'Compact', description: 'Show results after you start typing' },
  { id: 'expanded', label: 'Expanded', description: 'Show suggestions when it opens' },
] as const;

export function WindowModeSection({ preferences, onChange }: SettingsSectionProps) {
  return (
    <fieldset className="settings-group">
      <legend>Window mode</legend>
      <div className="option-grid">
        {windowModes.map((windowMode) => {
          const active = preferences.windowMode === windowMode.id;

          return (
            <button
              key={windowMode.id}
              type="button"
              className={`option-card window-mode-option${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange({ ...preferences, windowMode: windowMode.id })}
            >
              <span className={`window-mode-preview is-${windowMode.id}`} aria-hidden="true">
                <span className="window-mode-surface">
                  <i className="window-mode-input" />
                  {windowMode.id === 'expanded' && (
                    <span className="window-mode-results">
                      <i className="window-mode-result" />
                      <i className="window-mode-result" />
                    </span>
                  )}
                </span>
              </span>
              <span className="option-card-text">
                <span className="option-card-title">{windowMode.label}</span>
                <span className="option-card-description">{windowMode.description}</span>
              </span>
              {active && <CheckGlyph />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
