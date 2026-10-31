import type { ResultIconKind } from '../results/ResultGlyph';

export interface ActionDockItem {
  id: string;
  label: string;
  icon: ResultIconKind;
  onSelect: () => void;
  /** The action continues in a dialog, such as choosing a window. */
  opensDialog?: boolean;
  danger?: boolean;
  /** Adds a small gap above the item to separate it from the previous group. */
  startsGroup?: boolean;
}
