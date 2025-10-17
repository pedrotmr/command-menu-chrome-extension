import { useEffect, useState } from 'react';
import { Toast as ToastType } from '@/hooks/useToast';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

export function Toast({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Hide animation before unmount
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 2700);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`
        fixed top-6 right-6 z-[2147483647]
        flex items-center gap-2 px-3 py-2 rounded-md
        bg-[#18181b] border border-white/10
        text-white text-sm font-medium shadow-xl
        transition-all duration-200 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
      `}
    >
      <span className="text-sm opacity-60">{toast.isError ? '✕' : '✓'}</span>
      <span className="text-white/90">{toast.message}</span>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </>
  );
}
