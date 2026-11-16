import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types/auth';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization
  if (!allowedRoles.includes(user.role)) {
    console.warn(
      `[Security Guard] Access denied. User role '${user.role}' attempted to access restricted route requiring [${allowedRoles.join(', ')}]`
    );

    // If Store User tries to access Admin route, redirect to Billing
    if (user.role === 'store_user') {
      return <Navigate to="/billing" replace />;
    }

    // If Admin tries to access Billing route, redirect to Admin Dashboard
    if (user.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
