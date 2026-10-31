import { useState } from 'react';

type OptionalPermission = NonNullable<chrome.permissions.Permissions['permissions']>[number];

const permissionLabels: Partial<Record<OptionalPermission, string>> = {
  bookmarks: 'Bookmarks',
  history: 'Browsing history',
  tabGroups: 'Tab groups',
  sessions: 'Recently closed tabs',
  clipboardWrite: 'Clipboard access',
};

interface PermissionRequestProps {
  permissions: OptionalPermission[];
}

export function PermissionRequest({ permissions }: PermissionRequestProps) {
  const [status, setStatus] = useState('');
  const [requesting, setRequesting] = useState(false);
  const requestedLabels = permissions.map((permission) => permissionLabels[permission] ?? permission);

  async function requestAccess(): Promise<void> {
    if (!permissions.length || requesting) return;

    // Call from this button handler so Chrome sees the user gesture.
    const request = chrome.permissions.request({ permissions });
    setRequesting(true);
    setStatus('Waiting for Chrome…');
    try {
      const granted = await request;
      if (granted) {
        setStatus('Access granted. Return to the Command Menu to continue.');
        window.setTimeout(() => window.close(), 700);
      } else {
        setStatus('Access was not granted. You can close this window and keep using the Command Menu.');
      }
    } catch {
      setStatus('Chrome could not grant access. Close this window and try again.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <main className="cc-permission-request">
      <p className="cc-permission-eyebrow">Command Menu access</p>
      <h1>Allow {requestedLabels.join(' and ')}?</h1>
      <p className="cc-permission-copy">
        Chrome will ask for this access so the selected command can use it. You can change extension permissions in
        Chrome at any time.
      </p>
      <p className="cc-permission-status" role="status" aria-live="polite">
        {status}
      </p>
      <div className="cc-permission-actions">
        <button className="cc-permission-cancel" type="button" onClick={() => window.close()}>
          Cancel
        </button>
        <button
          className="cc-permission-grant"
          type="button"
          onClick={() => void requestAccess()}
          disabled={!permissions.length || requesting}
        >
          {requesting ? 'Waiting…' : 'Grant access'}
        </button>
      </div>
    </main>
  );
}
