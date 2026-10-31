export interface TabSwitcherProps {
  onClose: () => void;
  autoSwitchOnRelease?: boolean;
  openedAt?: number;
  modifierReleasedAtOpen?: boolean;
  surface?: 'popup' | 'overlay';
  cycleVersion?: number;
}
