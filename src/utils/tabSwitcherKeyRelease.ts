interface KeyReleaseState {
  lastModifierReleaseAt: number;
}

declare global {
  interface Window {
    __commandMenuKeyReleaseState?: KeyReleaseState;
  }
}

export function isTabSwitcherModifierKey(key: string): key is 'Meta' | 'Control' | 'Alt' {
  // Chrome lets users customize extension shortcuts, so the modifier may differ
  // from the operating system's suggested shortcut.
  return key === 'Meta' || key === 'Control' || key === 'Alt';
}

export function installTabSwitcherKeyReleaseMonitor(): void {
  if (window.__commandMenuKeyReleaseState) return;

  const state: KeyReleaseState = { lastModifierReleaseAt: 0 };
  window.__commandMenuKeyReleaseState = state;

  window.addEventListener(
    'keyup',
    (event: KeyboardEvent) => {
      if (isTabSwitcherModifierKey(event.key)) state.lastModifierReleaseAt = Date.now();
    },
    true,
  );
}

export function wasTabSwitcherModifierReleasedAfter(startedAt: number | null | undefined): boolean {
  if (!startedAt) return false;
  installTabSwitcherKeyReleaseMonitor();
  return (window.__commandMenuKeyReleaseState?.lastModifierReleaseAt ?? 0) >= startedAt;
}
