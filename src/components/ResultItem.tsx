import { useEffect, useRef } from 'react';
import { Item } from '@/types';

interface ResultItemProps {
  item: Item;
  isSelected: boolean;
  onClick: () => void;
}

export function ResultItem({ item, isSelected, onClick }: ResultItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view with instant behavior for keyboard navigation
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'instant' // Changed from 'smooth' for instant keyboard nav
      });
    }
  }, [isSelected]);

  const hasUrl = 'url' in item && item.url;

  return (
    <div
      ref={itemRef}
      onClick={onClick}
      className={`
        flex items-center gap-2.5 px-3 py-2 mx-2 my-0.5 rounded-md cursor-pointer
        transition-all duration-100 ease-out
        ${isSelected
          ? 'bg-white/10'
          : 'hover:bg-white/[0.04]'
        }
      `}
    >
      <div className="flex items-center justify-center w-7 h-7 rounded flex-shrink-0">
        <span className="text-lg">{item.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white/90 text-[13px] truncate leading-tight">{item.title}</div>
        {hasUrl && (
          <div className="text-white/35 text-[11px] truncate mt-0.5">{item.url}</div>
        )}
      </div>
      <span className="text-[10px] text-white/25 uppercase tracking-wide flex-shrink-0">
        {item.type === 'web-search' ? 'search' : item.type === 'bookmark' ? 'link' : item.type === 'history' ? 'history' : 'cmd'}
      </span>
    </div>
  );
}
