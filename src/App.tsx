import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { subscribeToAuthState } from '@/services/auth.service';
import { Toaster } from '@/components/ui/toaster';
import { LoadingScreen } from '@/components/common/LoadingScreen';

// Layouts
import { AppLayout } from '@/components/layout/AppLayout';

// Auth
import { LoginPage } from '@/pages/auth/LoginPage';

// Billing & Point of Sale Pages
import { BillingDashboard } from '@/pages/store/BillingDashboard';
import { NewInvoicePage } from '@/pages/store/NewInvoicePage';
import { BillingHistoryPage } from '@/pages/store/BillingHistoryPage';
import { CustomersStorePage } from '@/pages/store/CustomersStorePage';

// Guards
import { ProtectedRoute } from '@/components/router/ProtectedRoute';

function App() {
  const { setUser, setLoading, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAuthState((appUser, _firebaseUser) => {
      setUser(appUser, _firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Routes>
        {/* Public auth route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/billing" replace /> : <LoginPage />}
        />

        {/* Protected Billing & POS Terminal Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/billing" replace />} />
            <Route path="/billing" element={<BillingDashboard />} />
            <Route path="/billing/new" element={<NewInvoicePage />} />
            <Route path="/billing/history" element={<BillingHistoryPage />} />
            <Route path="/customers" element={<CustomersStorePage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/billing" replace />} />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
