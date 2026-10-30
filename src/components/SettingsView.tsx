import { AppearanceMode, CommandBarSize, ThemePreferences } from '@/types';
import { commandBarFonts, commandBarSizes, themeRegistry } from '@/themes';

interface SettingsViewProps {
  preferences: ThemePreferences;
  onChange: (preferences: ThemePreferences) => void;
  onManageShortcuts: () => void;
  onBack: () => void;
  viewRef: (node: HTMLElement | null) => void;
}

const appearances: Array<{ id: AppearanceMode; label: string; description: string }> = [
  { id: 'system', label: 'System', description: 'Follow your device' },
  { id: 'light', label: 'Light', description: 'Always light' },
  { id: 'dark', label: 'Dark', description: 'Always dark' },
];

const windowModes = [
  { id: 'compact', label: 'Compact', description: 'Show results after you start typing' },
  { id: 'expanded', label: 'Expanded', description: 'Show suggestions when it opens' },
] as const;

// Relative bar widths for the size previews; the real widths live in global.css.
const sizePreviewWidth: Record<CommandBarSize, string> = { compact: '52%', standard: '70%', wide: '90%' };

function CheckGlyph() {
  return <svg className="option-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.4 2.9 2.9 6.1-6.6" /></svg>;
}

export function SettingsView({ preferences, onChange, onManageShortcuts, onBack, viewRef }: SettingsViewProps) {
  const selectedPaletteId = themeRegistry.some((palette) => palette.id === preferences.palette)
    ? preferences.palette
    : themeRegistry[0].id;

  return (
    <section ref={viewRef} className="settings-view" aria-labelledby="settings-title" tabIndex={-1}>
      <button
        type="button"
        className="mode-icon-button settings-back-icon"
        aria-label="Back to command search"
        title="Back to command search"
        onClick={onBack}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
      </button>
      <div className="settings-heading">
        <h2 id="settings-title">Appearance</h2>
        <p>Choose how the Command Bar and Tab Switcher look.</p>
      </div>

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
                  let nextIndex = index;
                  if (columns === 1 && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
                    const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
                    nextIndex = (index + step + themeRegistry.length) % themeRegistry.length;
                  } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    const rowStart = Math.floor(index / columns) * columns;
                    const rowLength = Math.min(columns, themeRegistry.length - rowStart);
                    const column = index - rowStart;
                    nextIndex = rowStart + (column + (event.key === 'ArrowRight' ? 1 : rowLength - 1)) % rowLength;
                  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    const row = Math.floor(index / columns);
                    const rowCount = Math.ceil(themeRegistry.length / columns);
                    const column = index % columns;
                    const nextRow = (row + (event.key === 'ArrowDown' ? 1 : rowCount - 1)) % rowCount;
                    const rowStart = nextRow * columns;
                    const rowLength = Math.min(columns, themeRegistry.length - rowStart);
                    nextIndex = rowStart + Math.min(column, rowLength - 1);
                  } else if (event.key === 'Home') nextIndex = 0;
                  else if (event.key === 'End') nextIndex = themeRegistry.length - 1;
                  else return;

                  event.preventDefault();
                  const nextPalette = themeRegistry[nextIndex];
                  onChange({ ...preferences, palette: nextPalette.id });
                  grid?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
                }}
              >
                <span className="palette-swatch" aria-hidden="true">
                  <span style={{ background: palette.preview.light.background }}><i style={{ background: palette.preview.light.accent }} /></span>
                  <span style={{ background: palette.preview.dark.background }}><i style={{ background: palette.preview.dark.accent }} /></span>
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
                  let nextIndex = index;
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % commandBarFonts.length;
                  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index + commandBarFonts.length - 1) % commandBarFonts.length;
                  else if (event.key === 'Home') nextIndex = 0;
                  else if (event.key === 'End') nextIndex = commandBarFonts.length - 1;
                  else return;

                  event.preventDefault();
                  const nextFont = commandBarFonts[nextIndex];
                  onChange({ ...preferences, fontFamily: nextFont.id });
                  grid?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
                }}
              >
                <span className="font-family-sample" style={{ fontFamily: font.stack }} aria-hidden="true">{font.sample}</span>
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
                <span className="size-preview" aria-hidden="true"><span style={{ width: sizePreviewWidth[size.id] }} /></span>
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

      <fieldset className="settings-group">
        <legend>Window mode</legend>
        <div className="option-grid window-mode-grid">
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

      <div className="settings-row">
        <div className="settings-row-text">
          <span className="settings-row-title">Keyboard shortcuts</span>
          <span className="settings-row-description">Change or assign shortcuts in Chrome.</span>
        </div>
        <button type="button" className="button-secondary" onClick={onManageShortcuts}>
          Manage shortcuts
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4" /></svg>
        </button>
      </div>
    </section>
  );
}
