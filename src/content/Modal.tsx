import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette';

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
      {/* Modal Container */}
      <div
        className={`
          w-[600px] h-[420px]
          bg-[#18181b] rounded-xl shadow-2xl
          border border-white/10
          overflow-hidden pointer-events-auto
          transition-all duration-150 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-98 opacity-0'}
        `}
      >
        <CommandPalette onClose={onClose} isOpen={isOpen} />
      </div>
    </div>
  );
}
