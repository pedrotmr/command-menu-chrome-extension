import type { SettingsSectionProps } from '../types';
import { CheckGlyph } from '../CheckGlyph';
import { commandBarFonts } from '@/themes';

export function FontFamilySection({ preferences, onChange }: SettingsSectionProps) {
  return (
    <fieldset className="settings-group" role="radiogroup" aria-labelledby="font-family-group-label">
      <legend id="font-family-group-label">Font family</legend>
      <div className="option-grid font-family-grid">
        {commandBarFonts.map((font, index) => {
          const active = preferences.fontFamily === font.id;

          return (
            <button
              key={font.id}
              type="button"
              className={`option-card${active ? ' is-active' : ''}`}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange({ ...preferences, fontFamily: font.id })}
              onKeyDown={(event) => {
                const grid = event.currentTarget.closest('.font-family-grid');
                let nextIndex: number;

                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  nextIndex = (index + 1) % commandBarFonts.length;
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  nextIndex = (index + commandBarFonts.length - 1) % commandBarFonts.length;
                } else if (event.key === 'Home') {
                  nextIndex = 0;
                } else if (event.key === 'End') {
                  nextIndex = commandBarFonts.length - 1;
                } else {
                  return;
                }

                event.preventDefault();

                const nextFont = commandBarFonts[nextIndex];
                onChange({ ...preferences, fontFamily: nextFont.id });
                grid?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
              }}
            >
              <span className="font-family-sample" style={{ fontFamily: font.stack }} aria-hidden="true">
                {font.sample}
              </span>
              <span className="option-card-text">
                <span className="option-card-title">{font.label}</span>
                <span className="option-card-description">{font.description}</span>
              </span>
              {active && <CheckGlyph />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
