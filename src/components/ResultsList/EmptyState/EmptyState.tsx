import { getSearchProvider } from '@/utils/searchProviders';
import { ProviderIcon, providerAccentStyle } from '../../ProviderIcon';
import { ResultGlyph } from '../../results/ResultGlyph';
import type { EmptyStateProps } from '../types';

export function EmptyState({ isBusy, mode, loadingState, emptyState }: EmptyStateProps) {
  if (isBusy) {
    return (
      <div className="empty-state is-loading" role="status" aria-live="polite">
        <span className="loading-indicator" aria-hidden="true" />
        <p>{loadingState?.title ?? 'Loading results…'}</p>
        <span>{loadingState?.detail ?? 'This should only take a moment.'}</span>
      </div>
    );
  }

  const provider = emptyState?.providerId ? getSearchProvider(emptyState.providerId) : null;

  return (
    <div
      className={`empty-state${provider ? ' is-provider' : ''}`}
      style={provider ? providerAccentStyle(provider) : undefined}
    >
      {provider ? (
        <span className="empty-state-mark">
          <ProviderIcon providerId={provider.id} />
        </span>
      ) : (
        <span className="empty-state-icon" aria-hidden="true">
          <ResultGlyph kind="search" />
        </span>
      )}
      <div className="empty-state-copy" role="status">
        <p>{emptyState?.title ?? (mode === 'tabs' ? 'No matching tabs' : 'No matching commands or pages')}</p>
        <span>
          {emptyState?.detail ??
            (mode === 'tabs'
              ? 'Try part of the tab name or website.'
              : 'Try a shorter search or a provider prefix like “yt”.')}
        </span>
      </div>
      {emptyState?.action && (
        <button type="button" className="button-secondary empty-state-action" onClick={emptyState.action.onActivate}>
          {emptyState.action.label}
          {emptyState.action.shortcut && <kbd aria-hidden="true">{emptyState.action.shortcut}</kbd>}
        </button>
      )}
    </div>
  );
}
