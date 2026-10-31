import { SPLIT_VIEW_ID_NONE } from '@/utils/chromeApiConstants';

// Chrome returns this sentinel for tabs that are not part of a Split View.
export { SPLIT_VIEW_ID_NONE };

export function isTabInSplitView(tab: { splitViewId?: number } | null | undefined): tab is { splitViewId: number } {
  return typeof tab?.splitViewId === 'number' && tab.splitViewId !== SPLIT_VIEW_ID_NONE;
}
