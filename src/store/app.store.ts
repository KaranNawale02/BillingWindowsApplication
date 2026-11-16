/**
 * Global Application State Store (Zustand)
 *
 * UI state that needs to be shared across components.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface AppStore {
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Global loading state (for page-level operations)
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;

  // Confirm dialog
  confirmDialog: {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
  } | null;
  showConfirm: (config: Omit<NonNullable<AppStore['confirmDialog']>, 'isOpen'>) => void;
  closeConfirm: () => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // Sidebar
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        // Auto-remove after duration
        setTimeout(() => {
          get().removeToast(id);
        }, toast.duration ?? 5000);
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Page loading
      isPageLoading: false,
      setPageLoading: (loading) => set({ isPageLoading: loading }),

      // Confirm dialog
      confirmDialog: null,
      showConfirm: (config) =>
        set({ confirmDialog: { ...config, isOpen: true } }),
      closeConfirm: () => set({ confirmDialog: null }),
    }),
    { name: 'AppStore' }
  )
);
