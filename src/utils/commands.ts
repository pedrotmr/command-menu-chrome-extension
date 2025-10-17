import { Command } from '@/types';

export const commands: Command[] = [
  { id: 'reload-page', title: 'Reload Page', icon: '🔄', type: 'command' },
  { id: 'new-tab', title: 'Open New Tab', icon: '📄', type: 'command' },
  { id: 'go-back', title: 'Go Back', icon: '⬅️', type: 'command' },
  { id: 'go-forward', title: 'Go Forward', icon: '➡️', type: 'command' },
  { id: 'extensions-page', title: 'Open Extensions', icon: '🧩', type: 'command' },
  { id: 'shortcuts-page', title: 'Open Keyboard Shortcuts', icon: '⌨️', type: 'command' },
  { id: 'history-page', title: 'Open History', icon: '📚', type: 'command' },
  { id: 'downloads-page', title: 'Open Downloads', icon: '⬇️', type: 'command' },
  { id: 'settings-page', title: 'Open Settings', icon: '⚙️', type: 'command' },
  { id: 'new-incognito-window', title: 'New Incognito Window', icon: '🕵️', type: 'command' },
  { id: 'chrome-web-store', title: 'Chrome Web Store', icon: '🏬', type: 'command' },
];
