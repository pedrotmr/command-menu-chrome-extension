import type { SettingsSectionProps } from '../types';
import { CheckGlyph } from '../CheckGlyph';
import { themeRegistry } from '@/themes';

export function PaletteSection({ preferences, onChange }: SettingsSectionProps) {
  const selectedPaletteId = themeRegistry.some((palette) => palette.id === preferences.palette)
    ? preferences.palette
    : themeRegistry[0].id;

  return (
    <fieldset className="settings-group" role="radiogroup" aria-labelledby="palette-group-label">
      <legend id="palette-group-label">Color palette</legend>
      <div className="option-grid palette-grid">
        {themeRegistry.map((palette, index) => {
          const active = selectedPaletteId === palette.id;

          return (
            <button
              key={palette.id}
              type="button"
              className={`option-card${active ? ' is-active' : ''}`}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange({ ...preferences, palette: palette.id })}
              onKeyDown={(event) => {
                const grid = event.currentTarget.closest('.option-grid');
                const columns = grid
                  ? Math.max(1, getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length)
                  : 1;

                let nextIndex: number;

                if (columns === 1 && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
                  const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
                  nextIndex = (index + step + themeRegistry.length) % themeRegistry.length;
                } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  const rowStart = Math.floor(index / columns) * columns;
                  const rowLength = Math.min(columns, themeRegistry.length - rowStart);
                  const column = index - rowStart;

                  nextIndex = rowStart + ((column + (event.key === 'ArrowRight' ? 1 : rowLength - 1)) % rowLength);
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  const row = Math.floor(index / columns);
                  const rowCount = Math.ceil(themeRegistry.length / columns);

                  const column = index % columns;
                  const nextRow = (row + (event.key === 'ArrowDown' ? 1 : rowCount - 1)) % rowCount;
                  const rowStart = nextRow * columns;
                  const rowLength = Math.min(columns, themeRegistry.length - rowStart);

                  nextIndex = rowStart + Math.min(column, rowLength - 1);
                } else if (event.key === 'Home') {
                  nextIndex = 0;
                } else if (event.key === 'End') {
                  nextIndex = themeRegistry.length - 1;
                } else {
                  return;
                }

                event.preventDefault();

                const nextPalette = themeRegistry[nextIndex];
                onChange({ ...preferences, palette: nextPalette.id });
                grid?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
              }}
            >
              <span className="palette-swatch" aria-hidden="true">
                <span style={{ background: palette.preview.light.background }}>
                  <i style={{ background: palette.preview.light.accent }} />
                </span>
                <span style={{ background: palette.preview.dark.background }}>
                  <i style={{ background: palette.preview.dark.accent }} />
                </span>
              </span>
              <span className="option-card-text">
                <span className="option-card-title">{palette.name}</span>
                <span className="option-card-description">{palette.description}</span>
              </span>
              {active && <CheckGlyph />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
