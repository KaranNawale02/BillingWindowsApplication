export type AppUtility = 'inventory' | 'billing' | 'selector';

const STORAGE_KEY = 'kotuleshwar_active_utility';

export interface UtilityMeta {
  id: AppUtility;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  badge: string;
  defaultRoute: string;
  targetRole: 'admin' | 'store_user';
  accentColor: string;
}

export const UTILITY_CONFIGS: Record<'inventory' | 'billing', UtilityMeta> = {
  inventory: {
    id: 'inventory',
    title: 'Kotuleshwar Inventory Manager',
    shortTitle: 'Inventory Manager',
    tagline: 'Raw Materials, Stock & Production Control',
    description: 'Comprehensive inventory control, raw electronic components, BOM recipes, daily production entry, and repairs tracking.',
    badge: 'Inventory & Mfg Console',
    defaultRoute: '/dashboard',
    targetRole: 'admin',
    accentColor: 'blue',
  },
  billing: {
    id: 'billing',
    title: 'Kotuleshwar Billing & POS',
    shortTitle: 'Billing & POS',
    tagline: 'Fast Counter Point-of-Sale & Invoicing',
    description: 'Rapid counter billing, finished goods & loose component sales, barcode scanner support, and immediate Tax Invoice printing.',
    badge: 'Counter POS Terminal',
    defaultRoute: '/billing',
    targetRole: 'store_user',
    accentColor: 'emerald',
  },
};

export function detectActiveUtility(): AppUtility {
  try {
    // 1. Check window.location.search (e.g. ?utility=inventory or ?appMode=inventory)
    const urlParams = new URLSearchParams(window.location.search);
    const fromQuery = urlParams.get('utility') || urlParams.get('appMode') || urlParams.get('mode');
    if (fromQuery === 'inventory' || fromQuery === 'billing') {
      localStorage.setItem(STORAGE_KEY, fromQuery);
      return fromQuery;
    }

    // 2. Check window.location.hash query
    if (window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      const fromHash = hashParams.get('utility') || hashParams.get('appMode') || hashParams.get('mode');
      if (fromHash === 'inventory' || fromHash === 'billing') {
        localStorage.setItem(STORAGE_KEY, fromHash);
        return fromHash;
      }
    }

    // 3. Check persistent localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'inventory' || stored === 'billing') {
      return stored;
    }
  } catch (err) {
    console.error('Error detecting utility mode:', err);
  }

  // If no explicit mode, return 'selector' to present the choice
  return 'selector';
}

export function setActiveUtility(utility: 'inventory' | 'billing'): void {
  try {
    localStorage.setItem(STORAGE_KEY, utility);
    window.dispatchEvent(new CustomEvent('kotuleshwar-utility-changed', { detail: utility }));
  } catch (err) {
    console.error('Failed to set active utility:', err);
  }
}

export function resetUtilitySelection(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('kotuleshwar-utility-changed', { detail: 'selector' }));
  } catch (err) {
    console.error('Failed to reset utility selection:', err);
  }
}
