import type { ResultIconKind } from './ResultGlyph/types';

export type { ResultIconKind } from './ResultGlyph/types';

interface ResultGlyphProps {
  kind: ResultIconKind;
}

export function ResultGlyph({ kind }: ResultGlyphProps) {
  if (kind === 'web-store') {
    return (
      <svg viewBox="0 0 24 24" fill="#4285F4" aria-hidden="true">
        <path d="M0 1.637v19.09c0 .9.736 1.636 1.636 1.636h.131a10.4 10.4 0 0 1-.13-1.636 10.3 10.3 0 0 1 1.667-5.64l4.202 7.276h1.128A3.77 3.77 0 0 1 12 16.958a3.77 3.77 0 0 1 3.366 5.406h1.048a4.7 4.7 0 0 0-1.587-5.406h6.83a10.34 10.34 0 0 1 .577 5.406h.13c.9 0 1.636-.737 1.636-1.637V1.637Zm9.273 2.181h5.454a1.09 1.09 0 1 1 0 2.182H9.273a1.09 1.09 0 1 1 0-2.182M12 10.364a10.36 10.36 0 0 1 9.233 5.652H12a4.71 4.71 0 0 0-4.677 4.149L3.91 14.25A10.34 10.34 0 0 1 12 10.364" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'tab' && (
        <>
          <rect x="2.8" y="3.7" width="14.4" height="12.6" rx="2.1" />
          <path d="M3 7h14M6 5.3h.01M8.3 5.3h.01" />
        </>
      )}
      {kind === 'bookmark' && <path d="M5 3.2h10v13.6l-5-3.3-5 3.3V3.2Z" />}
      {kind === 'history' && (
        <>
          <path d="M4.1 7.1A6.3 6.3 0 1 1 3.7 11" />
          <path d="M3 4.3v3.6h3.6M10 6.2v4l2.8 1.6" />
        </>
      )}
      {kind === 'search' && (
        <>
          <circle cx="8.7" cy="8.7" r="5.3" />
          <path d="m12.6 12.6 4.1 4.1" />
        </>
      )}
      {kind === 'url' && (
        <>
          <path d="M11.5 3.8h4.7v4.7M16 4l-7.3 7.3" />
          <path d="M14.3 10.5v4.1a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6V7.3a1.6 1.6 0 0 1 1.6-1.6h4.1" />
        </>
      )}
      {kind === 'reload' && (
        <>
          <path d="M16.3 8a6.5 6.5 0 0 0-11.2-2L3.7 7.5" />
          <path d="M3.7 3.7v3.8h3.8M3.7 12a6.5 6.5 0 0 0 11.2 2l1.4-1.5" />
          <path d="M16.3 16.3v-3.8h-3.8" />
        </>
      )}
      {kind === 'settings' && (
        <>
          <path d="m8 2.8 4 .1.5 2a5.4 5.4 0 0 1 1.3.8l2-.6 1.9 3.4-1.5 1.4v1.6l1.5 1.4-1.9 3.4-2-.6a5.4 5.4 0 0 1-1.3.8l-.5 2-4-.1-.5-2a5.4 5.4 0 0 1-1.3-.8l-2 .6-1.9-3.4 1.5-1.4v-1.6L2.3 8.4l1.9-3.4 2 .6a5.4 5.4 0 0 1 1.3-.8l.5-2Z" />
          <circle cx="10" cy="10" r="2.2" />
        </>
      )}
      {kind === 'window' && (
        <>
          <rect x="3" y="3.8" width="14" height="12.4" rx="2" />
          <path d="M3.2 7h13.6M6 5.4h.01M8.2 5.4h.01" />
        </>
      )}
      {kind === 'group' && (
        <>
          <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
          <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" />
          <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" />
          <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" />
        </>
      )}
      {kind === 'plus' && (
        <>
          <path d="M10 4v12M4 10h12" />
        </>
      )}
      {kind === 'close' && (
        <>
          <path d="m5 5 10 10M15 5 5 15" />
        </>
      )}
      {kind === 'copy' && (
        <>
          <rect x="7" y="6.5" width="9" height="10" rx="1.7" />
          <path d="M12.5 6.5V5A1.5 1.5 0 0 0 11 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h2" />
        </>
      )}
      {kind === 'download' && (
        <>
          <path d="M10 3.5v9M6.5 9.5 10 13l3.5-3.5M4 16.5h12" />
        </>
      )}
      {kind === 'audio' && (
        <>
          <path d="M3.5 8v4h3l4 3.2V4.8l-4 3.2h-3Z" />
          <path d="M13.5 7a4.5 4.5 0 0 1 0 6M15.5 5a7.2 7.2 0 0 1 0 10" />
        </>
      )}
      {kind === 'pin' && (
        <>
          <path d="M7 3.5h6M8 3.5v4l-2.5 2.4v1.2h9v-1.2L12 7.5v-4M10 11.1v5.4" />
        </>
      )}
      {kind === 'edit' && (
        <>
          <path d="m4 13.5-.8 3.3 3.3-.8L16 7.5 12.5 4 4 12.5Z" />
          <path d="m10.8 5.7 3.5 3.5" />
        </>
      )}
      {kind === 'navigation' && (
        <>
          <path d="M6 4 3 7l3 3M3.5 7H12a4.5 4.5 0 0 1 0 9h-1" />
          <path d="m14 16 3-3-3-3" />
        </>
      )}
      {kind === 'extension' && (
        <>
          <path d="M4 3.5h4.2a2 2 0 1 0 3.8 0H16a1.5 1.5 0 0 1 1.5 1.5v3.2a2 2 0 1 0 0 3.6V16a1.5 1.5 0 0 1-1.5 1.5h-3.2a2 2 0 1 0-3.6 0H4A1.5 1.5 0 0 1 2.5 16V5A1.5 1.5 0 0 1 4 3.5Z" />
        </>
      )}
      {kind === 'privacy' && (
        <>
          <path d="M2.8 10s2.6-4.2 7.2-4.2 7.2 4.2 7.2 4.2-2.6 4.2-7.2 4.2S2.8 10 2.8 10Z" />
          <circle cx="10" cy="10" r="1.8" />
          <path d="m4 16 12-12" />
        </>
      )}
      {kind === 'zoom' && (
        <>
          <circle cx="8.4" cy="8.4" r="5" />
          <path d="m12.1 12.1 4.4 4.4M6.5 8.4h3.8M8.4 6.5v3.8" />
        </>
      )}
      {kind === 'keyboard' && (
        <>
          <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
          <path d="M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01M6 11h.01M9 11h.01M12 11h2.5M7 13.5h6" />
        </>
      )}
      {kind === 'command' && (
        <>
          <path d="M10 2.8v4.1M10 13.1v4.1M2.8 10h4.1M13.1 10h4.1" />
          <path d="m6.1 6.1 2 2m3.8 3.8 2 2m0-7.8-2 2m-3.8 3.8-2 2" />
          <circle cx="10" cy="10" r="2.1" />
        </>
      )}
      {kind === 'split' && (
        <>
          <rect x="2.8" y="3.8" width="14.4" height="12.4" rx="2" />
          <path d="M10 3.8v12.4" />
        </>
      )}
      {kind === 'link' && (
        <>
          <rect x="2.6" y="10.3" width="9.6" height="4.4" rx="2.2" transform="rotate(-45 7.4 12.5)" />
          <rect x="7.8" y="5.3" width="9.6" height="4.4" rx="2.2" transform="rotate(-45 12.6 7.5)" />
        </>
      )}
    </svg>
  );
}
