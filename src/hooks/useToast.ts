import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  isError: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, isError = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, isError };

    setToasts((prev) => [...prev, toast]);

    // Remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
