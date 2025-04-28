
import * as React from "react";
import {
  toast as sonnerToast,
  type ToastOptions
} from "sonner";

// Define the toast types
const TOAST_TYPES = ["success", "error", "info", "warning"] as const;
type ToastType = (typeof TOAST_TYPES)[number];

// Define the toast props that include our custom options
export type ToastProps = Partial<ToastOptions> & {
  description?: React.ReactNode;
  type?: ToastType;
  action?: React.ReactNode;
  title?: string;
};

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
      const { description, type, title, ...options } = props;
      sonnerToast(title || "", { description, ...options });
    };

    // Add methods for different toast types
    for (const type of TOAST_TYPES) {
      (toastFunction as any)[type] = (props: ToastProps | string) => {
        if (typeof props === 'string') {
          sonnerToast[type](props);
          return;
        }
        const { description, title, ...options } = props;
        sonnerToast[type](title || "", { description, ...options });
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
