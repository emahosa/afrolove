
import * as React from "react";
import {
  toast as sonnerToast,
  type ToastOptions as SonnerToastOptions,
} from "sonner";

// Define the toast types
const TOAST_TYPES = ["success", "error", "info", "warning"] as const;
type ToastType = (typeof TOAST_TYPES)[number];

// Define the toast props that include our custom options
export type ToastProps = {
  title?: string;
  description?: React.ReactNode;
  type?: ToastType;
  action?: React.ReactNode;
} & SonnerToastOptions;

// Create a type for the toast function
type ToastFunction = (props: ToastProps) => void;

// Create types for different toast methods
type ToastWithType = {
  [key in ToastType]: ToastFunction;
} & ToastFunction;

// The return type of our useToast hook
type UseToastReturn = {
  toast: ToastWithType;
  dismiss: (toastId?: string) => void;
  toasts: any[];
};

// Create our useToast hook
export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = React.useState<any[]>([]);

  // Create the toast function
  const toast = React.useMemo(() => {
    const toastFunction = ({ title, description, type, ...props }: ToastProps) => {
      sonnerToast(description as string, {
        ...props,
      });
    };

    // Add methods for different toast types
    for (const type of TOAST_TYPES) {
      (toastFunction as any)[type] = (props: Omit<ToastProps, "type">) =>
        toastFunction({ ...props, type });
    }

    return toastFunction as ToastWithType;
  }, []);

  return {
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        sonnerToast.dismiss(toastId);
      } else {
        sonnerToast.dismiss();
      }
    },
    toasts,
  };
};

// Re-export sonner toast for direct usage
export const toast = sonnerToast;
