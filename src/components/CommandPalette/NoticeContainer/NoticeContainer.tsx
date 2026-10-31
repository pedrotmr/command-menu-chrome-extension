import type { RefObject } from 'react';
import type { ToastMessage } from '../types';

interface NoticeContainerProps {
  toast: ToastMessage | null;
  liveStatusText: string;
  dismissToast: (restoreFocus?: boolean) => void;
  dismissButtonRef: RefObject<HTMLButtonElement | null>;
}

export function NoticeContainer({ toast, liveStatusText, dismissToast, dismissButtonRef }: NoticeContainerProps) {
  return (
    <div className={`notice-container${toast ? ' is-visible' : ''}`} data-tone={toast?.tone ?? 'success'}>
      <span className="notice-icon" aria-hidden="true">
        {toast?.tone === 'error' ? '!' : '✓'}
      </span>
      <div className="notice-message" role="status" aria-live="polite" aria-atomic="true">
        {liveStatusText}
      </div>
      {toast && (
        <button
          ref={dismissButtonRef}
          type="button"
          className="notice-dismiss"
          aria-label="Dismiss message"
          onClick={() => dismissToast(true)}
        >
          ×
        </button>
      )}
    </div>
  );
}
