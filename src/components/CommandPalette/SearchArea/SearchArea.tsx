import type { KeyboardEventHandler, RefObject } from 'react';
import type { PaletteItem } from '@/types';
import type { SearchProviderDefinition } from '@/utils/searchProviders';
import { resultDomId } from '../../ResultsList/helpers';
import { ProviderIcon, providerAccentStyle } from '../../ProviderIcon';
import { BackGlyph } from './BackGlyph';

interface SearchAreaSearchProps {
  activeProvider: SearchProviderDefinition | null;
  providerCandidate: SearchProviderDefinition | null;
  query: string;
  selectedItem?: PaletteItem;
}

interface SearchAreaViewStateProps {
  inputRef: RefObject<HTMLInputElement | null>;
  hasSelectedTab: boolean;
  showResults: boolean;
  resultsLength: number;
}

interface SearchAreaHandlerProps {
  onQueryChange: (query: string) => void;
  onSearchKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onReturnToCommandSearch: () => void;
  onActivateProvider: (provider: SearchProviderDefinition) => void;
  onOpenSettings: () => void;
}

interface SearchAreaProps extends SearchAreaSearchProps, SearchAreaViewStateProps, SearchAreaHandlerProps {}

export function SearchArea({
  activeProvider,
  providerCandidate,
  query,
  inputRef,
  selectedItem,
  hasSelectedTab,
  showResults,
  resultsLength,
  onQueryChange,
  onSearchKeyDown,
  onReturnToCommandSearch,
  onActivateProvider,
  onOpenSettings,
}: SearchAreaProps) {
  return (
    <div className="search-area">
      <span className="search-symbol" aria-hidden="true">
        {activeProvider ? (
          <ProviderIcon providerId={activeProvider.id} />
        ) : (
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="8.8" cy="8.8" r="5.7" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.1 13.1 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <label className="visually-hidden" htmlFor="command-center-search">
        {activeProvider
          ? `${activeProvider.verb} ${activeProvider.name}`
          : 'Search commands, tabs, bookmarks, history, and the web'}
      </label>
      {activeProvider && (
        <span className="provider-chip" style={providerAccentStyle(activeProvider)}>
          <span>{activeProvider.name}</span>
          <button
            type="button"
            aria-label="Back to command search"
            title="Back to command search"
            onClick={onReturnToCommandSearch}
          >
            <BackGlyph />
          </button>
        </span>
      )}
      <input
        ref={inputRef}
        id="command-center-search"
        className="search-input"
        name="command-query"
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onSearchKeyDown}
        placeholder={activeProvider ? `${activeProvider.verb} ${activeProvider.name}…` : 'Search commands or a website'}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={showResults && resultsLength > 0}
        aria-controls={showResults ? 'command-center-results' : undefined}
        aria-activedescendant={selectedItem ? resultDomId(selectedItem.id) : undefined}
        aria-describedby={
          [providerCandidate ? 'provider-tab-hint' : '', hasSelectedTab ? 'tab-actions-hint' : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        autoComplete="off"
        spellCheck={false}
      />
      <span id="tab-actions-hint" className="visually-hidden">
        F2 renames the selected tab. Shift F10, the Context Menu key, or Command/Control K opens tab actions.
      </span>
      {providerCandidate && (
        <span id="provider-tab-hint" className="visually-hidden">
          Press Tab to {providerCandidate.verb.toLowerCase()} {providerCandidate.name}.
        </span>
      )}
      <div className="mode-nav" role="group" aria-label="Command Bar controls">
        {providerCandidate && (
          <button
            type="button"
            className="provider-hint"
            aria-label={`${providerCandidate.verb} ${providerCandidate.name}`}
            onClick={() => onActivateProvider(providerCandidate)}
          >
            <ProviderIcon providerId={providerCandidate.id} className="provider-hint-icon" />
            <kbd aria-hidden="true">Tab</kbd>
            <span>
              {providerCandidate.verb} {providerCandidate.name}
            </span>
          </button>
        )}
        <button type="button" aria-label="Appearance settings" className="mode-icon-button" onClick={onOpenSettings}>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 5.5h5M11.5 5.5H17M3 10h2M8.5 10H17M3 14.5h8M14.5 14.5H17" />
            <circle cx="10" cy="5.5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="14.5" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
