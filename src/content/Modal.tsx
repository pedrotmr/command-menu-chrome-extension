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
        <div className="absolute inset-0 bg-[rgba(12,12,16,0.92)] backdrop-blur-[20px] backdrop-saturate-150 rounded-2xl" />

        {/* Ethereal glow border system */}
        <div className="modal-glow-border" />
        <div className="modal-corner-glow" />
        <div className="modal-edge-light" />

        {/* Shadow */}
        <div className="absolute inset-0 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_10px_25px_-8px_rgba(0,0,0,0.3),0_0_40px_-10px_rgba(100,120,200,0.15)] pointer-events-none" />
        {/* Content */}
        <div className="relative h-full">
          <CommandPalette onClose={onClose} isOpen={isOpen} />
        </div>
      </div>
    </div>
  );
}
