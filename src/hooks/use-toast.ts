
import * as React from "react";
import {
  toast as sonnerToast,
  type ToastT,
} from "sonner";

// Define the toast types
const TOAST_TYPES = ["success", "error", "info", "warning"] as const;
type ToastType = (typeof TOAST_TYPES)[number];

// Define the toast props that include our custom options
export type ToastProps = {
  description?: React.ReactNode;
  type?: ToastType;
  action?: React.ReactNode;
} & Omit<ToastT, "description">;

// Create a type for the toast function
type ToastFunction = (props: ToastProps | string) => void;

// Create types for different toast methods
type ToastWithType = {
  [key in ToastType]: (props: ToastProps | string) => void;
} & ToastFunction;

// The return type of our useToast hook
type UseToastReturn = {
  toast: ToastWithType;
  dismiss: (toastId?: string) => void;
};

// Create our useToast hook
export const useToast = (): UseToastReturn => {
  // Create the toast function
  const toast = React.useMemo(() => {
    const toastFunction = (props: ToastProps | string) => {
      if (typeof props === 'string') {
        sonnerToast(props);
        return;
      }
      const { description, type, ...options } = props;
      sonnerToast(description as string, options);
    };

    // Add methods for different toast types
    for (const type of TOAST_TYPES) {
      (toastFunction as any)[type] = (props: ToastProps | string) => {
        if (typeof props === 'string') {
          sonnerToast[type](props);
          return;
        }
        const { description, ...options } = props;
        sonnerToast[type](description as string, options);
      };
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
  };
};

// Re-export sonner toast for direct usage
export const toast = sonnerToast;
