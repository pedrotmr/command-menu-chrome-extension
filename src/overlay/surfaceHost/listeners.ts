import type { PaletteMode } from '@/types';
import { wasCommandPaletteEscapeHandled } from '@/utils/escapeEvents';
import { hideHost, setPageInert, showHost } from './host';
import type { OpenRequest, SurfaceController } from './types';

export const attachOverlayListeners = (controller: SurfaceController, mountPoint: HTMLElement): (() => void) => {
  const { bridge, host, surface } = controller;

  const onMessage = (
    message: OpenRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (sender.id !== chrome.runtime.id) {
      return false;
    }

    if (!message || typeof message !== 'object') return false;

    if (message.action === 'ui:tabs-cycle') {
      const cycles = Math.max(1, Math.min(64, Math.floor(Number(message.cycles) || 1)));

      if (bridge.cycleHandler) {
        bridge.cycleHandler(cycles);
      } else {
        bridge.pendingCycles += cycles;
      }

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

      if (bridge.closeHandler) {
        bridge.closeHandler(Boolean(message.switching));
      } else {
        bridge.pendingOpen = false;
        bridge.pendingClose = true;
        bridge.pendingSwitching = Boolean(message.switching);
        hideHost(host);
        setPageInert(controller, false);
      }

      sendResponse({ success: true, wasOpen });
      return false;
    }

    const requestedSurface: PaletteMode = message.mode === 'tabs' ? 'tabs' : 'commands';

    if (message.action !== 'overlay:open' || requestedSurface !== surface) {
      return false;
    }

    const openedAt = Number.isFinite(message.openedAt) ? Number(message.openedAt) : Date.now();

    if (bridge.openHandler) {
      bridge.openHandler(Boolean(message.autoSwitchOnRelease), openedAt);
    } else {
      bridge.pendingClose = false;
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
    if (!event.isTrusted) return;
    if (
      event.isComposing ||
      event.keyCode === 229 ||
      event.key !== 'Escape' ||
      mountPoint.querySelector('dialog[open]')
    ) {
      return;
    }

    if (!bridge.pendingOpen && bridge.surfaceOpenHandler?.() !== true) {
      return;
    }

    window.setTimeout(() => {
      if (wasCommandPaletteEscapeHandled(event) || mountPoint.querySelector('dialog[open]')) {
        return;
      }

      if (!bridge.pendingOpen && bridge.surfaceOpenHandler?.() !== true) {
        return;
      }

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

  window.addEventListener('keydown', closeOnEscape, true);
  chrome.runtime.onMessage.addListener(onMessage);

  return () => {
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener('keydown', closeOnEscape, true);
  };
};
