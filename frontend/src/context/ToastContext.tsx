"use client";

import React, { createContext, useReducer, useMemo, useCallback } from 'react';
import type { ToastProps } from "@/components/ui/toast";

const DEFAULT_DURATION = 5000;

type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

export type Toast = Omit<ToastProps, "id"> & {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: ToastVariant;
};

interface State {
  toasts: Toast[];
}

type Action = 
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; id: string };

const toastReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts],
      };
    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.id),
      };
    default:
      return state;
  }
};

let toastCount = 0;

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Toast) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', id });
  }, []);

  const toast = useCallback((toast: Toast) => {
    const id = (toastCount++).toString();
    const duration = toast.duration || DEFAULT_DURATION;
    
    dispatch({ type: 'ADD_TOAST', toast: { ...toast, id, duration } });

    setTimeout(() => {
      dismiss(id);
    }, duration);
  }, [dismiss]);
  
  const value = useMemo(() => ({ ...state, toast, dismiss }), [state, toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
