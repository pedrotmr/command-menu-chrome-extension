import { asPositiveInteger } from './chromeHelpers';

interface Request {
  action: string;
  [key: string]: unknown;
}

const tabActions = new Set([
  'tabs:activate',
  'tabs:rename',
  'tabs:close',
  'tabs:pin',
  'tabs:mute',
  'tabs:move-new-window',
  'tabs:move',
  'tabs:group',
  'tabs:split-active',
  'groups:create',
]);
const optionalPermissions = new Set(['bookmarks', 'history', 'tabGroups', 'sessions', 'clipboardWrite']);

export const validateRequest = (raw: unknown, sender: chrome.runtime.MessageSender, extensionId: string): Request => {
  if (sender.id !== extensionId || (sender.tab && sender.frameId !== 0)) {
    throw new Error('Untrusted message sender.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid message.');
  const message = raw as Request;
  if (typeof message.action !== 'string') throw new Error('Invalid command.');
  const requireId = (key: string) => {
    if (asPositiveInteger(message[key]) === undefined) throw new Error(`Invalid ${key}.`);
  };
  if (tabActions.has(message.action)) requireId('tabId');
  if ((message.action === 'tabs:copy-url' || message.action === 'tabs:copy-title') && message.tabId !== undefined) {
    requireId('tabId');
  }
  if (message.action === 'tabs:move') requireId('windowId');
  if (message.sourceTabId != null) requireId('sourceTabId');
  if (message.windowId !== undefined) requireId('windowId');
  if (message.action === 'tabs:group' || message.action === 'groups:update') {
    if (typeof message.groupId !== 'number' || !Number.isSafeInteger(message.groupId) || message.groupId < 0) {
      throw new Error('Invalid groupId.');
    }
  }
  for (const key of ['pinned', 'muted']) {
    if (message.action === `tabs:${key === 'pinned' ? 'pin' : 'mute'}` && typeof message[key] !== 'boolean') {
      throw new Error(`Invalid ${key}.`);
    }
  }
  if (message.action === 'tabs:rename' && typeof message.name !== 'string') throw new Error('Invalid name.');
  if (message.action.startsWith('browser:open-') && 'url' in message && typeof message.url !== 'string') {
    throw new Error('Invalid URL.');
  }
  if (message.action.startsWith('permissions:') && message.action !== 'permissions:get-all') {
    if (
      !Array.isArray(message.permissions) ||
      !message.permissions.every((p) => typeof p === 'string' && optionalPermissions.has(p))
    ) {
      throw new Error('Invalid optional permissions.');
    }
    if (message.origins !== undefined && (!Array.isArray(message.origins) || message.origins.length)) {
      throw new Error('Website permissions are not supported.');
    }
  }
  return message;
};
