import { useState } from 'react';
import type { PaletteItem } from '@/types';
import { getSearchProvider } from '@/utils/searchProviders';
import { ProviderIcon } from '../../ProviderIcon';
import { ResultGlyph, type ResultIconKind } from '../../results/ResultGlyph';

const resultIconKind = (item: PaletteItem): ResultIconKind => {
  if (item.type === 'tab') {
    return 'tab';
  }

  if (item.type === 'bookmark') {
    return 'bookmark';
  }

  if (item.type === 'history') {
    return 'history';
  }

  if (item.type === 'search') {
    return 'search';
  }

  if (item.type === 'url') {
    return 'url';
  }

  const id = item.id;

  if (id.includes('search')) {
    return 'search';
  }

  if (id.includes('history') || id.includes('reopen')) {
    return 'history';
  }

  if (id.includes('bookmark')) {
    return 'bookmark';
  }

  if (id.includes('reload') || id.includes('refresh')) {
    return 'reload';
  }

  if (id.includes('shortcuts')) {
    return 'keyboard';
  }

  if (id.includes('settings')) {
    return 'settings';
  }

  if (id === 'chrome-web-store') {
    return 'web-store';
  }

  if (id.includes('extensions')) {
    return 'extension';
  }

  if (id.includes('incognito')) {
    return 'privacy';
  }

  if (id.includes('zoom')) {
    return 'zoom';
  }

  if (id.includes('copy')) {
    return 'copy';
  }

  if (id.includes('download')) {
    return 'download';
  }

  if (id.includes('mute') || id.includes('audio')) {
    return 'audio';
  }

  if (id.includes('pin')) {
    return 'pin';
  }

  if (id.includes('rename')) {
    return 'edit';
  }

  if (id.includes('back') || id.includes('forward')) {
    return 'navigation';
  }

  if (id.includes('close')) {
    return 'close';
  }

  if (id.includes('group') || id.includes('split')) {
    return 'group';
  }

  if (id.includes('window') || id.includes('minimize') || id.includes('maximize')) {
    return 'window';
  }

  if (id.includes('new-tab')) {
    return 'plus';
  }

  if (item.category === 'Tabs') {
    return 'tab';
  }

  if (item.category === 'Groups') {
    return 'group';
  }

  return 'command';
};

interface ItemIconProps {
  item: PaletteItem;
}

export function ItemIcon({ item }: ItemIconProps) {
  const [failedFaviconUrl, setFailedFaviconUrl] = useState<string | null>(null);
  const kind = resultIconKind(item);

  if (item.type === 'search') {
    const providerId = item.id.replace(/^search-/, '');

    if (getSearchProvider(providerId)) {
      return <ProviderIcon providerId={providerId} />;
    }
  }

  if (item.type === 'tab' && item.favIconUrl) {
    const failed = failedFaviconUrl === item.favIconUrl;
    return (
      <span className={`favicon-wrap${failed ? ' is-fallback' : ''}`}>
        <img
          className="result-favicon"
          src={item.favIconUrl}
          alt=""
          loading="lazy"
          onError={() => setFailedFaviconUrl(item.favIconUrl!)}
          onLoad={() => setFailedFaviconUrl((failedUrl) => (failedUrl === item.favIconUrl ? null : failedUrl))}
        />
        <span className="favicon-fallback">
          <ResultGlyph kind="tab" />
        </span>
      </span>
    );
  }

  return (
    <span className="result-icon">
      <ResultGlyph kind={kind} />
    </span>
  );
}
