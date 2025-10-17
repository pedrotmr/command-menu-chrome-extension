import { useEffect, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', autoFocus = true }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  return (
    <div className="relative flex items-center px-4 py-3 border-b border-white/[0.06]">
      <span className="text-base mr-2.5 opacity-30">🔍</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-[15px] font-normal outline-none placeholder:text-white/30"
        spellCheck={false}
      />
    </div>
  );
}
