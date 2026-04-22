'use client';

import { useCallback, useState } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_DURATION = 3000;

export interface ToastOptions {
  duration?: number;
  action?: Toast['action'];
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
      duration = DEFAULT_DURATION,
      action?: Toast['action']
    ): string => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type, duration, action };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, 'success', options?.duration, options?.action),
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, 'error', options?.duration, options?.action),
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, 'warning', options?.duration, options?.action),
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, 'info', options?.duration, options?.action),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};
