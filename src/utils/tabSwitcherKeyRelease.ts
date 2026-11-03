interface KeyReleaseState {
  lastModifierReleaseAt: number;
}

declare global {
  interface Window {
    __keybarKeyReleaseState?: KeyReleaseState;
  }
}

export const isTabSwitcherModifierKey = (key: string): key is 'Meta' | 'Control' | 'Alt' => {
  // Chrome lets users customize extension shortcuts, so the modifier may differ
  // from the operating system's suggested shortcut.
  return key === 'Meta' || key === 'Control' || key === 'Alt';
};

export const installTabSwitcherKeyReleaseMonitor = (): void => {
  if (window.__keybarKeyReleaseState) {
    return;
  }

  const state: KeyReleaseState = { lastModifierReleaseAt: 0 };
  window.__keybarKeyReleaseState = state;

  window.addEventListener(
    'keyup',
    (event: KeyboardEvent) => {
      if (event.isTrusted && isTabSwitcherModifierKey(event.key)) {
        state.lastModifierReleaseAt = Date.now();
      }
    },
    true,
  );
};

export const wasTabSwitcherModifierReleasedAfter = (startedAt: number | null | undefined): boolean => {
  if (!startedAt) {
    return false;
  }

  installTabSwitcherKeyReleaseMonitor();
  return (window.__keybarKeyReleaseState?.lastModifierReleaseAt ?? 0) >= startedAt;
};
