import { CommandPalette } from '@/components/CommandPalette';
import { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Modal({ isOpen, onClose }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Prevent page scroll
      document.body.classList.add('no-scroll');
    } else {
      setIsVisible(false);
      // Allow page scroll
      document.body.classList.remove('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-start justify-center pt-[15vh] pointer-events-none">
      {/* Modal Container — frosted glass */}
      <div
        className={`
          relative w-[600px] h-[420px]
          rounded-2xl overflow-hidden pointer-events-auto
          transition-all ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Glass background layer */}
        <div className="absolute inset-0 bg-[rgba(12,12,16,0.92)] backdrop-blur-[20px] backdrop-saturate-150" />
        {/* Border */}
        <div className="absolute inset-0 rounded-2xl border border-white/[0.1] pointer-events-none" />
        {/* Top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
        {/* Shadow */}
        <div className="absolute inset-0 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45),0_8px_20px_-6px_rgba(0,0,0,0.25)] pointer-events-none" />
        {/* Content */}
        <div className="relative h-full">
          <CommandPalette onClose={onClose} isOpen={isOpen} />
        </div>
      </div>
    </div>
  );
}
