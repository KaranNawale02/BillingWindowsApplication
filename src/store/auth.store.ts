/**
 * Authentication State Store (Zustand)
 *
 * Global authentication state management.
 * Single source of truth for the logged-in user.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppUser, UserRole, RolePermissions } from '@/types/auth';
import { ROLE_PERMISSIONS } from '@/types/auth';

interface AuthStore {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: AppUser | null, firebaseUser?: unknown) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;

  // Computed helpers
  getPermissions: () => RolePermissions | null;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  isAdmin: () => boolean;
  isStoreUser: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      setUser: (user) =>
        set({
          user: user ? { ...user, id: user.id || user.uid } : null,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      clearError: () => set({ error: null }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      getPermissions: () => {
        const { user } = get();
        if (!user) return null;
        return ROLE_PERMISSIONS[user.role] ?? null;
      },

      hasPermission: (permission) => {
        const permissions = get().getPermissions();
        if (!permissions) return false;
        return permissions[permission] ?? false;
      },

      isAdmin: () => get().user?.role === 'admin',

      isStoreUser: () => get().user?.role === 'store_user',
    }),
    { name: 'AuthStore' }
  )
);
