import { CommandPalette } from '@/components/CommandPalette';

export function Popup() {
  return (
    <div className="w-[640px] h-[520px] bg-[#1e1e1e]">
      <CommandPalette onClose={() => window.close()} isOpen={true} />
    </div>
  );
}
