import type { ManagedTab } from '@/utils/tabItems';

export const optionId = (tabId: number): string => {
  return `recent-tab-${tabId}`;
};

export const tabInitials = (tab: ManagedTab): string => {
  const title = tab.customName || tab.title || tab.url || 'Tab';

  return title.trim().slice(0, 1).toLocaleUpperCase();
};

export const tabHost = (tab: ManagedTab): string => {
  try {
    return new URL(tab.url || '').hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
