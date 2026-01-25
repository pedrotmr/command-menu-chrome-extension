import { useEffect, useRef, KeyboardEvent } from 'react';
import { SearchProvider } from '@/types';
import { searchProviders } from '@/utils/searchProviders';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  activeProvider: SearchProvider | null;
  setActiveProvider: (provider: SearchProvider | null) => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  autoFocus = true,
  activeProvider,
  setActiveProvider,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && value) {
      const provider = searchProviders.find((p) =>
        p.keywords.some((k) => value.toLowerCase().trim() === k.toLowerCase().trim())
      );

      if (provider) {
        e.preventDefault();
        setActiveProvider(provider);
        onChange('');
      }
    } else if (e.key === 'Backspace' && !value && activeProvider) {
      setActiveProvider(null);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center px-4 pt-5 pb-4">
        {activeProvider ? (
        <div className="flex items-center bg-white/10 text-white text-xs font-semibold rounded-md mr-2">
          <span className="pl-2 pr-1">{activeProvider.name}</span>
          <button
            onClick={() => setActiveProvider(null)}
            className="p-1 hover:bg-white/20 rounded-full focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : (
        <span className="text-base mr-2.5 opacity-30">🔍</span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-lg font-normal outline-none placeholder:text-white/30"
        spellCheck={false}
      />
      </div>

      {/* Ethereal glow separator */}
      <div className="separator-glow" />
    </div>
  );
}