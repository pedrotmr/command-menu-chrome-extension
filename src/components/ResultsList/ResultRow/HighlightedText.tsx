import { parseProviderQuery } from '@/utils/searchProviders';

interface HighlightedTextProps {
  text: string;
  query: string;
  providerSearchMode: boolean;
}

export function HighlightedText({ text, query, providerSearchMode }: HighlightedTextProps) {
  const searchTerm = providerSearchMode ? query : (parseProviderQuery(query)?.query ?? query);
  const terms = [...new Set(searchTerm.trim().split(/\s+/).filter(Boolean))];

  if (!terms.length) {
    return <>{text}</>;
  }

  const escapeRegExp = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const searchableTerms = new Set(terms.map((term) => term.toLocaleLowerCase()));
  return (
    <>
      {text
        .split(expression)
        .map((part, index) =>
          searchableTerms.has(part.toLocaleLowerCase()) ? <mark key={`${index}-${part}`}>{part}</mark> : part,
        )}
    </>
  );
}
