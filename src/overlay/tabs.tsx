import { createElement } from 'react';
import { TabSwitcher } from '@/components/TabSwitcher';
import { mountOverlaySurface } from './surfaceHost';
import styleText from '@/styles/global.css?inline';

mountOverlaySurface('tabs', styleText, ({ onClose, autoSwitchOnRelease, openedAt, modifierReleasedAtOpen, cycleVersion }) =>
  createElement(TabSwitcher, {
    onClose,
    autoSwitchOnRelease,
    openedAt,
    modifierReleasedAtOpen,
    surface: 'overlay',
    cycleVersion,
  })
);
