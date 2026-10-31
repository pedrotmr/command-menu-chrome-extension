interface ShortcutSettingsRowProps {
  onManageShortcuts: () => void;
}

export function ShortcutSettingsRow({ onManageShortcuts }: ShortcutSettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className="settings-row-title">Keyboard shortcuts</span>
        <span className="settings-row-description">Change or assign shortcuts in Chrome.</span>
      </div>
      <button type="button" className="button-secondary" onClick={onManageShortcuts}>
        Manage shortcuts
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4" />
        </svg>
      </button>
    </div>
  );
}
