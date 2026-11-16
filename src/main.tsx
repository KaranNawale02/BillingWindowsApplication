import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Purge any stale mock/cached data so the app displays only real Firebase data
try {
  const legacyKeys = [
    'electro_inventory_items',
    'electro_finished_products',
    'electro_customers',
    'electro_invoices',
    'electro_stock_adjustments',
    'electro_stock_movements',
    'electro_product_boms',
    'electro_production_batches',
  ];
  if (localStorage.getItem('kotuleshwar_clean_slate_v5') !== 'true') {
    legacyKeys.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem('kotuleshwar_clean_slate_v5', 'true');
  }
} catch (e) {
  console.error('Failed to clear legacy cache:', e);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
