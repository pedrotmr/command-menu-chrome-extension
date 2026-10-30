import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import { applyTheme, defaultThemePreferences, normalizeThemePreferences, readThemeCache, themePreferencesStorageKey } from '@/themes';
import { PaletteMode, ThemePreferences } from '@/types';
import { installProductFont } from '@/utils/installProductFont';
import { installTabSwitcherKeyReleaseMonitor, wasTabSwitcherModifierReleasedAfter } from '@/utils/tabSwitcherKeyRelease';
import '@/styles/global.css';

const urlParameters = new URLSearchParams(window.location.search);
const isFallbackWindow = urlParameters.has('mode') && urlParameters.has('openedAt');
if (isFallbackWindow) document.documentElement.dataset.popupWindow = 'fallback';

performance.mark('cc:popup-start', { startTime: 0 });
const cachedTheme = readThemeCache();
installProductFont(document, cachedTheme.fontFamily);
installTabSwitcherKeyReleaseMonitor();
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(cachedTheme, systemDark);
let popupRequestedAt: number | null = null;

function isPaletteMode(value: string | null): value is PaletteMode {
  return value === 'commands' || value === 'tabs' || value === 'settings';
}

function guardShortcutChordOnOpen(): void {
  const deadline = performance.now() + 180;
  const removeGuard = () => window.removeEventListener('keydown', suppressChord, true);
  const suppressChord = (event: KeyboardEvent) => {
    if (performance.now() > deadline) {
      removeGuard();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      removeGuard();
    }
  };

  window.addEventListener('keydown', suppressChord, true);
  window.setTimeout(removeGuard, 180);
}

async function start(): Promise<void> {
  const fromUrl = urlParameters.get('mode');
  const urlOpenedAt = Number(urlParameters.get('openedAt'));
  if (Number.isFinite(urlOpenedAt) && urlOpenedAt > 0) popupRequestedAt = urlOpenedAt;
  let storedMode: string | null = null;
  let switcherAutoSwitchOnRelease = false;
  let switcherModifierReleased = false;
  let switcherOpenedAt = 0;
  let initialTheme: ThemePreferences = cachedTheme;

  try {
    const [sessionValues, themeValues] = await Promise.all([
      chrome.storage.session.get(['nextPaletteMode', 'nextTabSwitcherAutoSwitchOnRelease']),
      chrome.storage.local.get(themePreferencesStorageKey),
    ]);
    storedMode = sessionValues.nextPaletteMode ?? null;
    switcherAutoSwitchOnRelease = sessionValues.nextTabSwitcherAutoSwitchOnRelease === true;
    const sessionRequestedAt = sessionValues.paletteRequestedAt;
    if (typeof sessionRequestedAt === 'number' && sessionRequestedAt > 0) popupRequestedAt = sessionRequestedAt;
    switcherOpenedAt = popupRequestedAt ?? 0;
    switcherModifierReleased = switcherAutoSwitchOnRelease && wasTabSwitcherModifierReleasedAfter(switcherOpenedAt);
    initialTheme = normalizeThemePreferences(themeValues[themePreferencesStorageKey] ?? defaultThemePreferences);
    void chrome.storage.session.remove(['nextPaletteMode', 'nextTabSwitcherAutoSwitchOnRelease', 'paletteRequestedAt']).catch(() => undefined);
  } catch {
    // Cached appearance and the normal command mode keep the popup usable if storage is unavailable.
  }

  applyTheme(initialTheme, systemDark);
  const mode = isPaletteMode(fromUrl) ? fromUrl : isPaletteMode(storedMode) ? storedMode : 'commands';
  if (popupRequestedAt !== null && (mode === 'commands' || mode === 'tabs')) {
    guardShortcutChordOnOpen();
  }
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  createRoot(rootElement).render(
    <StrictMode>
      <Popup
        initialMode={mode}
        initialTheme={initialTheme}
        initialSwitcherAutoSwitchOnRelease={switcherAutoSwitchOnRelease}
        initialSwitcherOpenedAt={switcherOpenedAt}
        initialSwitcherModifierReleased={switcherModifierReleased}
      />
    </StrictMode>
  );

  requestAnimationFrame(() => {
    const durationMs = popupRequestedAt === null
      ? performance.now()
      : Math.max(0, Date.now() - popupRequestedAt);
    const host = window as Window & { __commandCenterTimings?: Array<{ name: string; durationMs: number; at: number }> };
    const metrics = host.__commandCenterTimings ?? (host.__commandCenterTimings = []);
    metrics.push({ name: 'popup-first-frame', durationMs, at: Date.now() });
    if (metrics.length > 100) metrics.splice(0, metrics.length - 100);
    window.dispatchEvent(new Event('command-center:timing'));
    performance.mark('cc:first-frame');
    performance.measure('cc:popup-first-frame', 'cc:popup-start', 'cc:first-frame');
  });
}

void start();
