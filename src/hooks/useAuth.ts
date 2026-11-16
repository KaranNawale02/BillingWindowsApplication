/**
 * useAuth Hook
 *
 * Provides authentication state and actions to components.
 * Handles the Firebase auth state subscription on mount.
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { loginWithEmailPassword, logout as authLogout, onAuthChange } from '@/services/auth.service';
import { writeAuditLog } from '@/services/audit.service';
import { ROUTES } from '@/config/routes';
import type { LoginFormData } from '@/types/auth';

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    setUser,
    setLoading,
    setError,
    clearError,
    logout: storeLogout,
    hasPermission,
    isAdmin,
    isStoreUser,
  } = useAuthStore();

  const navigate = useNavigate();

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  /** Handle login form submission */
  const login = useCallback(
    async (formData: LoginFormData) => {
      clearError();
      setLoading(true);

      try {
        const user = await loginWithEmailPassword(formData.email, formData.password);
        setUser(user);

        const uid = user.id || user.uid;
        await writeAuditLog({
          userId: uid,
          userRole: user.role,
          action: 'LOGIN',
          entityType: 'USER',
          entityId: uid,
        });

        // Redirect based on role
        if (user.role === 'admin') {
          navigate(ROUTES.ADMIN.DASHBOARD, { replace: true });
        } else {
          navigate(ROUTES.STORE.BILLING, { replace: true });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
        setError(message);
      }
    },
    [clearError, setLoading, setUser, setError, navigate]
  );

  /** Handle logout */
  const logout = useCallback(async () => {
    if (user) {
      const uid = user.id || user.uid;
      await writeAuditLog({
        userId: uid,
        userRole: user.role,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: uid,
      });
    }

    await authLogout();
    storeLogout();
    navigate(ROUTES.LOGIN, { replace: true });
  }, [user, storeLogout, navigate]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    clearError,
    hasPermission,
    isAdmin,
    isStoreUser,
  };
}
