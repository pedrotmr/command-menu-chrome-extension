import { Item } from '@/types';
import { ResultItem } from './ResultItem';

interface ResultsListProps {
  items: Item[];
  selectedIndex: number;
  onItemClick: (index: number) => void;
}

export function ResultsList({ items, selectedIndex, onItemClick }: ResultsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/30 py-12">
        <div className="text-3xl mb-2 opacity-40">🔍</div>
        <div className="text-[13px]">No results found</div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto custom-scrollbar flex-1 py-1.5">
      {items.map((item, index) => (
        <ResultItem
          key={item.id}
          item={item}
          isSelected={index === selectedIndex}
          onClick={() => onItemClick(index)}
        />
      ))}
    </div>
  );
}
