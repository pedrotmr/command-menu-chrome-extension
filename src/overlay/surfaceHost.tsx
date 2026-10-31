import { createElement, StrictMode, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { applyTheme, defaultThemePreferences, normalizeThemePreferences, themePreferencesStorageKey } from '@/themes';
import { PaletteMode, ThemePreferences } from '@/types';
import { loadProductFontForPage } from '@/utils/installProductFont';
import {
  installTabSwitcherKeyReleaseMonitor,
  wasTabSwitcherModifierReleasedAfter,
} from '@/utils/tabSwitcherKeyRelease';
import { wasCommandPaletteEscapeHandled } from '@/utils/escapeEvents';

export type OverlaySurface = 'commands' | 'tabs';

interface SurfaceActions {
  theme: ThemePreferences;
  themeRoot: HTMLElement;
  onClose: () => void;
  autoSwitchOnRelease: boolean;
  openedAt: number;
  modifierReleasedAtOpen: boolean;
  cycleVersion: number;
}

type SurfaceRenderer = (actions: SurfaceActions) => ReactNode;

interface SurfaceController {
  surface: OverlaySurface;
  host: HTMLElement;
  root: Root;
  focusTarget: Element | null;
  focusTargetPreservedUntil: number;
  pageInertState: { body: HTMLElement; wasInert: boolean } | null;
  bridge: SurfaceBridge;
  dispose: () => void;
}

interface SurfaceBridge {
  openHandler?: (autoSwitchOnRelease: boolean, openedAt: number) => void;
  closeHandler?: (switching: boolean) => void;
  cycleHandler?: (cycles: number) => void;
  switcherOpenHandler?: () => boolean;
  surfaceOpenHandler?: () => boolean;
  pendingOpen: boolean;
  pendingAutoSwitchOnRelease: boolean;
  pendingOpenedAt: number;
  pendingClose: boolean;
  pendingSwitching: boolean;
  pendingCycles: number;
}

interface OpenRequest {
  action?: string;
  mode?: string;
  switching?: boolean;
  autoSwitchOnRelease?: boolean;
  openedAt?: number;
  cycles?: number;
}

const hostId = `${chrome.runtime.id}-command-center-surface`;
const controllerKey = `__commandCenterSurface_${chrome.runtime.id}`;
const sharedWindow = window as unknown as Window & Record<string, unknown>;

installTabSwitcherKeyReleaseMonitor();

function setPageInert(controller: SurfaceController, inert: boolean): void {
  if (inert) {
    const body = document.body;
    if (!body || controller.pageInertState?.body === body) return;
    setPageInert(controller, false);
    controller.pageInertState = { body, wasInert: body.inert };
    body.inert = true;
    return;
  }

  const previous = controller.pageInertState;
  if (!previous) return;
  if (previous.body.isConnected && previous.body.inert) {
    previous.body.inert = previous.wasInert;
  }
  controller.pageInertState = null;
}

function showHost(host: HTMLElement): void {
  host.style.setProperty('display', 'block', 'important');
  try {
    if (!host.matches(':popover-open')) host.showPopover();
  } catch {
    host.removeAttribute('popover');
  }
}

function hideHost(host: HTMLElement): void {
  try {
    if (host.matches(':popover-open')) host.hidePopover();
  } catch {
    host.removeAttribute('popover');
  }
  host.style.setProperty('display', 'none', 'important');
}

function createHost(): { host: HTMLElement; mountPoint: HTMLElement } {
  const host = document.createElement('div');
  host.id = hostId;
  host.setAttribute('popover', 'manual');
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('inset', '0', 'important');
  host.style.setProperty('width', '100vw', 'important');
  host.style.setProperty('height', '100vh', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  host.style.setProperty('display', 'none', 'important');
  host.style.setProperty('visibility', 'visible', 'important');
  host.style.setProperty('opacity', '1', 'important');
  host.style.setProperty('overflow', 'visible', 'important');
  host.style.setProperty('transform', 'none', 'important');
  host.style.setProperty('filter', 'none', 'important');
  host.style.setProperty('clip', 'auto', 'important');
  host.style.setProperty('clip-path', 'none', 'important');
  host.style.setProperty('isolation', 'isolate', 'important');
  host.style.setProperty('pointer-events', 'none', 'important');
  host.style.setProperty('contain', 'layout style paint', 'important');
  host.style.setProperty('background', 'transparent', 'important');
  host.style.setProperty('margin', '0', 'important');
  host.style.setProperty('padding', '0', 'important');
  host.style.setProperty('border', '0', 'important');
  host.style.setProperty('box-sizing', 'border-box', 'important');
  host.style.setProperty('direction', 'ltr', 'important');
  host.style.setProperty('unicode-bidi', 'isolate', 'important');
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = sharedWindow.__commandCenterOverlayStyles as string;
  const mountPoint = document.createElement('div');
  mountPoint.className = 'cc-extension-root';
  shadowRoot.addEventListener(
    'wheel',
    (event) => {
      const wheelEvent = event as WheelEvent;
      if (wheelEvent.ctrlKey) return;
      const target = wheelEvent.target instanceof Element ? wheelEvent.target : null;
      const horizontal = Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY);
      const delta = horizontal ? wheelEvent.deltaX : wheelEvent.deltaY;
      let current: Element | null = target;
      while (current) {
        if (
          current instanceof HTMLElement &&
          current.matches('.results-list, .settings-view, .flow-dialog, .action-dock-menu')
        ) {
          const position = horizontal ? current.scrollLeft : current.scrollTop;
          const extent = horizontal
            ? current.scrollWidth - current.clientWidth
            : current.scrollHeight - current.clientHeight;
          const canScroll = delta < 0 ? position > 0 : position < extent - 1;
          if (canScroll) return;
        }
        current = current.parentElement;
      }
      wheelEvent.preventDefault();
    },
    { capture: true, passive: false },
  );
  shadowRoot.append(style, mountPoint);
  return { host, mountPoint };
}

function OverlayFrame({
  controller,
  renderSurface,
}: {
  controller: SurfaceController;
  renderSurface: SurfaceRenderer;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreferences>(defaultThemePreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [autoSwitchOnRelease, setAutoSwitchOnRelease] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [modifierReleasedAtOpen, setModifierReleasedAtOpen] = useState(false);
  const [cycleVersion, setCycleVersion] = useState(0);
  const isOpenRef = useRef(false);
  const openRequestVersion = useRef(0);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onSchemeChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onSchemeChange);
    return () => query.removeEventListener('change', onSchemeChange);
  }, []);

  useEffect(() => {
    const onStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local' || !changes[themePreferencesStorageKey]) return;
      setTheme(normalizeThemePreferences(changes[themePreferencesStorageKey].newValue ?? defaultThemePreferences));
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  useEffect(() => {
    applyTheme(theme, systemDark, controller.host);
    if (isOpen) {
      void loadProductFontForPage(controller.host.ownerDocument, theme.fontFamily).catch((error: unknown) => {
        console.warn(`[Command Menu] Failed to load ${theme.fontFamily} font for the page overlay.`, error);
      });
    }
  }, [theme, systemDark, controller.host, isOpen]);

  useEffect(() => {
    const openSurface = (shouldAutoSwitchOnRelease: boolean, requestOpenedAt: number) => {
      if (isOpenRef.current) {
        if (controller.surface === 'tabs') setCycleVersion((version) => version + 1);
        return;
      }
      isOpenRef.current = true;
      const requestVersion = ++openRequestVersion.current;
      const launchTime = Number.isFinite(requestOpenedAt) && requestOpenedAt > 0 ? requestOpenedAt : Date.now();
      setAutoSwitchOnRelease(shouldAutoSwitchOnRelease);
      setOpenedAt(launchTime);
      setModifierReleasedAtOpen(shouldAutoSwitchOnRelease && wasTabSwitcherModifierReleasedAfter(launchTime));
      if (
        !controller.focusTarget ||
        Date.now() > controller.focusTargetPreservedUntil ||
        !controller.focusTarget.isConnected
      ) {
        controller.focusTarget = document.activeElement;
      }
      controller.focusTargetPreservedUntil = 0;
      showHost(controller.host);
      setPageInert(controller, true);
      void chrome.storage.local
        .get(themePreferencesStorageKey)
        .then((values) => {
          if (!isOpenRef.current || requestVersion !== openRequestVersion.current) return;
          setTheme(normalizeThemePreferences(values[themePreferencesStorageKey] ?? defaultThemePreferences));
          setIsOpen(true);
        })
        .catch(() => {
          if (isOpenRef.current && requestVersion === openRequestVersion.current) setIsOpen(true);
        });
    };
    const closeSurface = (switching: boolean) => {
      openRequestVersion.current++;
      isOpenRef.current = false;
      setIsOpen(false);
      hideHost(controller.host);
      setPageInert(controller, false);
      const target = controller.focusTarget;
      if (switching) {
        controller.focusTargetPreservedUntil = Date.now() + 1600;
        return;
      }
      controller.focusTarget = null;
      controller.focusTargetPreservedUntil = 0;
      if (target instanceof HTMLElement && target.isConnected) {
        requestAnimationFrame(() => target.focus({ preventScroll: true }));
      }
    };

    controller.bridge.openHandler = openSurface;
    controller.bridge.closeHandler = closeSurface;
    controller.bridge.cycleHandler = (cycles) => {
      if (isOpenRef.current && controller.surface === 'tabs') setCycleVersion((version) => version + cycles);
      else controller.bridge.pendingCycles += cycles;
    };
    controller.bridge.switcherOpenHandler = () => isOpenRef.current && controller.surface === 'tabs';
    controller.bridge.surfaceOpenHandler = () => isOpenRef.current;
    if (controller.bridge.pendingOpen) {
      controller.bridge.pendingOpen = false;
      openSurface(controller.bridge.pendingAutoSwitchOnRelease, controller.bridge.pendingOpenedAt);
      controller.bridge.pendingAutoSwitchOnRelease = false;
      controller.bridge.pendingOpenedAt = 0;
    }
    if (controller.bridge.pendingCycles) {
      const cycles = controller.bridge.pendingCycles;
      controller.bridge.pendingCycles = 0;
      setCycleVersion((version) => version + cycles);
    }
    if (controller.bridge.pendingClose) {
      controller.bridge.pendingClose = false;
      closeSurface(controller.bridge.pendingSwitching);
    }
    return () => {
      controller.bridge.openHandler = undefined;
      controller.bridge.closeHandler = undefined;
      controller.bridge.cycleHandler = undefined;
      controller.bridge.switcherOpenHandler = undefined;
      controller.bridge.surfaceOpenHandler = undefined;
    };
  }, [controller]);

  function closeSurface(): void {
    controller.bridge.closeHandler?.(false);
  }

  if (!isOpen) return null;
  return (
    <div className="cc-overlay-stage">
      <div className="cc-overlay-backdrop" aria-hidden="true" onClick={closeSurface} />
      {renderSurface({
        theme,
        themeRoot: controller.host,
        onClose: closeSurface,
        autoSwitchOnRelease,
        openedAt,
        modifierReleasedAtOpen,
        cycleVersion,
      })}
    </div>
  );
}

export function mountOverlaySurface(surface: OverlaySurface, styles: string, renderSurface: SurfaceRenderer): void {
  sharedWindow.__commandCenterOverlayStyles = styles;
  const previous = sharedWindow[controllerKey] as SurfaceController | undefined;
  if (previous) previous.dispose();
  document.getElementById(hostId)?.remove();

  const { host, mountPoint } = createHost();
  const root = createRoot(mountPoint);
  const bridge: SurfaceBridge = {
    pendingOpen: false,
    pendingAutoSwitchOnRelease: false,
    pendingOpenedAt: 0,
    pendingClose: false,
    pendingSwitching: false,
    pendingCycles: 0,
  };
  const onMessage = (
    message: OpenRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message.action === 'ui:tabs-cycle') {
      const cycles = Math.max(1, Math.min(64, Math.floor(Number(message.cycles) || 1)));
      if (bridge.cycleHandler) bridge.cycleHandler(cycles);
      else bridge.pendingCycles += cycles;
      sendResponse({ success: true });
      return false;
    }
    if (message.action === 'tabs:switcher-status') {
      sendResponse({ open: bridge.switcherOpenHandler?.() ?? false });
      return false;
    }
    if (message.action === 'overlay:surface-status') {
      sendResponse({ open: bridge.surfaceOpenHandler?.() ?? false, surface });
      return false;
    }
    if (message.action === 'overlay:close') {
      const wasOpen = bridge.surfaceOpenHandler?.() ?? bridge.pendingOpen;
      if (bridge.closeHandler) bridge.closeHandler(Boolean(message.switching));
      else {
        bridge.pendingClose = true;
        bridge.pendingSwitching = Boolean(message.switching);
        hideHost(host);
        setPageInert(controller, false);
      }
      sendResponse({ success: true, wasOpen });
      return false;
    }
    const requestedSurface: PaletteMode = message.mode === 'tabs' ? 'tabs' : 'commands';
    if (message.action !== 'overlay:open' || requestedSurface !== surface) return false;
    const openedAt = Number.isFinite(message.openedAt) ? Number(message.openedAt) : Date.now();
    if (bridge.openHandler) bridge.openHandler(Boolean(message.autoSwitchOnRelease), openedAt);
    else {
      bridge.pendingOpen = true;
      bridge.pendingAutoSwitchOnRelease = Boolean(message.autoSwitchOnRelease);
      bridge.pendingOpenedAt = openedAt;
      showHost(host);
      setPageInert(controller, true);
    }
    sendResponse({ success: true });
    return false;
  };
  const closeOnEscape = (event: globalThis.KeyboardEvent) => {
    if (event.key !== 'Escape' || mountPoint.querySelector('dialog[open]')) return;
    if (!bridge.pendingOpen && bridge.surfaceOpenHandler?.() !== true) return;

    window.setTimeout(() => {
      if (wasCommandPaletteEscapeHandled(event) || mountPoint.querySelector('dialog[open]')) return;
      if (!bridge.pendingOpen && bridge.surfaceOpenHandler?.() !== true) return;

      if (bridge.closeHandler) {
        bridge.closeHandler(false);
      } else {
        bridge.pendingOpen = false;
        bridge.pendingClose = true;
        bridge.pendingSwitching = false;
        hideHost(host);
        setPageInert(controller, false);
      }
    }, 0);
  };
  const controller: SurfaceController = {
    surface,
    host,
    root,
    focusTarget: previous?.focusTarget ?? null,
    focusTargetPreservedUntil: previous?.focusTargetPreservedUntil ?? 0,
    pageInertState: null,
    bridge,
    dispose: () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener('keydown', closeOnEscape, true);
      hideHost(host);
      setPageInert(controller, false);
      root.unmount();
      host.remove();
    },
  };
  sharedWindow[controllerKey] = controller;
  window.addEventListener('keydown', closeOnEscape, true);
  chrome.runtime.onMessage.addListener(onMessage);
  root.render(createElement(StrictMode, null, createElement(OverlayFrame, { controller, renderSurface })));
}
