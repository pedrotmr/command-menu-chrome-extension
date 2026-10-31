import type { CommandBarSize } from '@/types';
import type { SettingsSectionProps } from '../types';
import { CheckGlyph } from '../CheckGlyph';
import { commandBarSizes } from '@/themes';

// Relative bar widths for the size previews; the real widths live in global.css.
const sizePreviewWidth: Record<CommandBarSize, string> = { compact: '52%', standard: '70%', wide: '90%' };

export function CommandBarSizeSection({ preferences, onChange }: SettingsSectionProps) {
  return (
    <fieldset className="settings-group">
      <legend>Command Bar size</legend>
      <div className="option-grid">
        {commandBarSizes.map((size) => {
          const active = preferences.size === size.id;

          return (
            <button
              key={size.id}
              type="button"
              className={`option-card${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange({ ...preferences, size: size.id })}
            >
              <span className="size-preview" aria-hidden="true">
                <span style={{ width: sizePreviewWidth[size.id] }} />
              </span>
              <span className="option-card-text">
                <span className="option-card-title">{size.label}</span>
                <span className="option-card-description">{size.description}</span>
              </span>
              {active && <CheckGlyph />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
