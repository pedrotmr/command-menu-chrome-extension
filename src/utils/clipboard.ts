export const writeClipboardText = async (
  value: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined = navigator.clipboard,
  ownerDocument: Document = document,
): Promise<void> => {
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(value);
      return;
    } catch {
      // HTTP pages cannot use the Clipboard API; fall through to the legacy copy command.
    }
  }

  const previousFocus = ownerDocument.activeElement as HTMLElement | null;
  const textarea = ownerDocument.createElement('textarea');

  textarea.value = value;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.setAttribute('readonly', '');
  textarea.tabIndex = -1;
  Object.assign(textarea.style, {
    position: 'fixed',
    top: '0',
    left: '-10000px',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  });

  ownerDocument.body.appendChild(textarea);

  try {
    textarea.focus({ preventScroll: true });
    textarea.select();

    if (!ownerDocument.execCommand('copy')) {
      throw new Error('Clipboard access is unavailable on this page.');
    }
  } finally {
    textarea.remove();

    if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
  }
};
