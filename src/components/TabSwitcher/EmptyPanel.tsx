import type { MouseEventHandler, RefObject } from 'react';

interface EmptyPanelProps {
  message: string;
  stateRef: RefObject<HTMLParagraphElement | null>;
  onMouseDown: MouseEventHandler<HTMLDivElement>;
}

export function EmptyPanel({ message, stateRef, onMouseDown }: EmptyPanelProps) {
  return (
    <div
      className="tab-switcher-panel tab-switcher-empty-panel"
      role="presentation"
      style={{ width: 'min(320px, 88vw, calc(100vw - 48px))' }}
      onMouseDown={onMouseDown}
    >
      <p ref={stateRef} className="tab-switcher-state" role="status" aria-live="polite" aria-atomic="true" tabIndex={0}>
        {message}
      </p>
    </div>
  );
}
