import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { getFinishedProducts } from '@/services/product.service';
import { getInventoryItems } from '@/services/inventory.service';
import {
  getCustomers,
  searchCustomers,
  createCustomer,
} from '@/services/customer.service';
import {
  calculateCartTotals,
  finalizeInvoice,
} from '@/services/billing.service';
import { useAuthStore } from '@/store/auth.store';
import { useAppStore } from '@/store/app.store';
import { useBarcodeScanner } from '@/components/common/BarcodeScannerListener';
import { CartItem, Customer, PaymentMethod, Invoice } from '@/types/billing';
import { FinishedProduct } from '@/types/product';
import { InventoryItem } from '@/types/inventory';
import { InvoiceReceipt, printInvoiceDocument } from '@/components/billing/InvoiceReceipt';
import {
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  Barcode,
  User,
  CreditCard,
  QrCode,
  RotateCw,
  Banknote,
  Receipt,
  ShoppingCart,
  Minus,
  PackageX,
  Layers,
  Cpu,
  RefreshCw,
} from 'lucide-react';

export interface CatalogItem {
  id: string;
  itemType: 'finished_product' | 'inventory_item';
  code: string;
  name: string;
  category: string;
  sellingPrice: number;
  mrp?: number;
  currentStock: number;
  soldCount?: number;
  unit: string;
  barcode?: string;
  description?: string;
}

export function BillingDashboard() {
  const { user } = useAuthStore();
  const { addToast } = useAppStore();

  // Unified Product & Inventory Catalog
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'finished' | 'components'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Customers
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>(0);

  // Modals
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [finalizedInvoice, setFinalizedInvoice] = useState<Invoice | null>(null);

  // New Customer Form
  const [newCustName, setNewCustName] = useState('Mohate Feter');
  const [newCustPhone, setNewCustPhone] = useState('9875500000');
  const [newCustAddress, setNewCustAddress] = useState('Akole Ahilyanagar');
  const [newCustGstin, setNewCustGstin] = useState('');

  // Manual Barcode Scanner Simulation
  const [manualBarcode, setManualBarcode] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingCatalog(true);
    try {
      const [prds, invs, custs] = await Promise.all([
        getFinishedProducts(),
        getInventoryItems(),
        getCustomers(),
      ]);

      // Map finished products
      const mappedPrds: CatalogItem[] = (prds || []).map((p: FinishedProduct) => ({
        id: p.id,
        itemType: 'finished_product',
        code: p.productCode,
        name: p.name,
        category: p.category || 'Finished Goods',
        sellingPrice: Number(p.sellingPrice) || 0,
        mrp: p.mrp ? Number(p.mrp) : undefined,
        currentStock: Number(p.currentStock) || 0,
        soldCount: Number(p.soldCount ?? (p as any).soldItems ?? (p as any).totalSold ?? 0),
        unit: 'unit',
        barcode: p.barcode,
        description: p.description,
      }));

      // Map raw materials & components
      const mappedInvs: CatalogItem[] = (invs || []).map((i: InventoryItem) => ({
        id: i.id,
        itemType: 'inventory_item',
        code: i.itemCode,
        name: i.name,
        category: i.category || 'Components & Spares',
        sellingPrice: Number(i.sellingPrice ?? i.purchasePrice ?? 0),
        mrp: i.mrp ? Number(i.mrp) : undefined,
        currentStock: Number(i.currentStock) || 0,
        soldCount: Number((i as any).soldCount ?? (i as any).soldItems ?? (i as any).totalSold ?? 0),
        unit: i.unit || 'pcs',
        barcode: i.barcode,
        description: i.description || (i.partNumber ? `Part: ${i.partNumber}` : undefined),
      }));

      setCatalogItems([...mappedPrds, ...mappedInvs]);

      // Customer name is compulsory for billing - do not auto-fill with anonymous default
      if (!selectedCustomer) {
        setSelectedCustomer(null);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Keyboard wedge USB barcode scanner hook
  useBarcodeScanner({
    onScan: (scannedCode) => {
      handleBarcodeScanned(scannedCode);
    },
  });

  const handleBarcodeScanned = (code: string) => {
    const item = catalogItems.find(
      (c) =>
        (c.barcode && c.barcode.toLowerCase() === code.toLowerCase()) ||
        c.code.toLowerCase() === code.toLowerCase()
    );
    if (item) {
      addToCart(item);
      addToast({
        title: 'Barcode Scanned',
        description: `Added "${item.name}" to cart.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Barcode Not Found',
        description: `No product or item matching barcode: ${code}`,
        type: 'warning',
      });
    }
  };

  // Customer search
  useEffect(() => {
    if (customerSearch.trim().length > 1) {
      searchCustomers(customerSearch).then((results) => setCustomerResults(results));
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  // Add item to cart
  const addToCart = (item: CatalogItem) => {
    if (item.currentStock <= 0) {
      addToast({
        title: 'Out of Stock',
        description: `"${item.name}" has no available inventory.`,
        type: 'error',
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.id);
      if (existing) {
        if (existing.quantity >= item.currentStock) {
          addToast({
            title: 'Stock Limit Reached',
            description: `Only ${item.currentStock} ${item.unit} available in stock.`,
            type: 'warning',
          });
          return prev;
        }
        return prev.map((c) =>
          c.productId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          productId: item.id,
          productCode: item.code,
          productName: item.name,
          mrp: item.mrp || item.sellingPrice,
          sellingPrice: item.sellingPrice,
          availableStock: item.currentStock,
          quantity: 1,
          discount: 0,
          gstRate: 0,
          itemType: item.itemType,
          unit: item.unit,
        },
      ];
    });
  };

  // Update item quantity
  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.availableStock) {
              addToast({
                title: 'Insufficient Stock',
                description: `Maximum available quantity is ${item.availableStock} ${item.unit || ''}.`,
                type: 'warning',
              });
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Update unit selling price on the fly (User request: let cashier edit the price)
  const updateCartPrice = (productId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, sellingPrice: newPrice } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAmountPaid(0);
  };

  // Calculations
  const totals = calculateCartTotals(cart);

  // Sync amountPaid
  useEffect(() => {
    setAmountPaid(totals.grandTotal);
  }, [totals.grandTotal]);

  // Create customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const created = await createCustomer({
        name: newCustName,
        mobileNumber: newCustPhone,
        address: newCustAddress,
        gstin: newCustGstin,
        createdBy: user?.id || 'store-usr-002',
        userRole: 'store_user',
      });

      setSelectedCustomer(created);
      setIsNewCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustGstin('');

      addToast({
        title: 'Customer Registered',
        description: `Customer "${created.name}" selected.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Error Creating Customer',
        description: err.message,
        type: 'error',
      });
    }
  };

  // Finalize invoice: deduct stock in Firebase & save invoice
  const handleFinalizeInvoice = async () => {
    if (!selectedCustomer || !selectedCustomer.name?.trim()) {
      addToast({
        title: 'Customer Name Compulsory',
        description: 'Customer name is compulsory for billing. Please enter or select a customer name.',
        type: 'warning',
      });
      setIsNewCustomerOpen(true);
      return;
    }

    if (cart.length === 0) {
      addToast({
        title: 'Empty Cart',
        description: 'Please add products or components to the cart before generating invoice.',
        type: 'warning',
      });
      return;
    }

    try {
      const invoice = await finalizeInvoice({
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          mobile: selectedCustomer.mobileNumber,
          address: selectedCustomer.address,
          gstin: selectedCustomer.gstin,
        },
        cartItems: cart,
        paymentMethod,
        amountPaid: Number(amountPaid) || 0,
        userId: user?.id || 'store-usr-002',
        userRole: (user?.role as any) || 'store_user',
      });

      setFinalizedInvoice(invoice);
      setIsInvoiceModalOpen(true);

      // Immediately deduct on screen in local state for both finished goods & components
      setCatalogItems((prev) =>
        prev.map((catItem) => {
          const cartItem = cart.find(
            (c) => c.productId === catItem.id || c.productCode === catItem.code
          );
          if (cartItem) {
            return {
              ...catItem,
              currentStock: Math.max(0, catItem.currentStock - cartItem.quantity),
              soldCount: (catItem.soldCount || 0) + cartItem.quantity,
            };
          }
          return catItem;
        })
      );

      clearCart();

      // Refresh both finished goods & raw materials from database to reflect server state
      await loadInitialData();

      addToast({
        title: 'Invoice Finalized & Saved',
        description: `Invoice #${invoice.invoiceNumber} recorded. Stock deducted from database.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Billing Error',
        description: err.message,
        type: 'error',
      });
    }
  };

  // Filter items by category tab & search query
  const filteredCatalog = catalogItems.filter((item) => {
    // 1. Tab filter
    if (catalogFilter === 'finished' && item.itemType !== 'finished_product') return false;
    if (catalogFilter === 'components' && item.itemType !== 'inventory_item') return false;

    // 2. Search filter
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const finishedCount = catalogItems.filter((i) => i.itemType === 'finished_product').length;
  const componentsCount = catalogItems.filter((i) => i.itemType === 'inventory_item').length;

  return (
    <div className="space-y-4">
      {/* Top Customer Selection Bar */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Customer Search & Select */}
            <div className="flex-1 w-full relative">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>
                  Customer (Bill To) <span className="text-destructive font-bold">* Compulsory</span>
                </span>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-[11px] text-destructive hover:underline font-normal cursor-pointer"
                  >
                    Change Customer
                  </button>
                )}
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search customer by name, 10-digit mobile, or type name..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    icon={<Search className="w-4 h-4 text-muted-foreground" />}
                  />

                  {customerSearch.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-border">
                      {customerResults.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerSearch('');
                            setCustomerResults([]);
                          }}
                          className="p-2.5 hover:bg-muted/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-foreground">{cust.name}</div>
                            <div className="text-muted-foreground">
                              Ph: {cust.mobileNumber} {cust.address ? `• ${cust.address}` : ''}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {cust.totalPurchases} Invoices
                          </Badge>
                        </div>
                      ))}

                      {/* Quick Assign typed name */}
                      <div
                        onClick={() => {
                          setSelectedCustomer({
                            id: `cust-walkin-${Date.now()}`,
                            customerId: 'CUST-WALKIN',
                            name: customerSearch.trim(),
                            mobileNumber: '',
                            address: '',
                            city: 'Ahilyanagar',
                            state: 'Maharashtra',
                            totalPurchaseAmount: 0,
                            totalPurchases: 0,
                            isActive: true,
                            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
                            updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
                            createdBy: 'store-user',
                            updatedBy: 'store-user',
                          });
                          setCustomerSearch('');
                          setCustomerResults([]);
                        }}
                        className="p-2.5 bg-primary/5 hover:bg-primary/10 cursor-pointer flex items-center justify-between text-xs transition-colors font-medium text-primary"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Use <strong>"{customerSearch.trim()}"</strong> as Customer Name</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">Quick Assign</Badge>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewCustomerOpen(true)}
                  className="gap-1.5 shrink-0 text-xs"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span>New Customer</span>
                </Button>
              </div>
            </div>

            {/* Selected Customer Preview Card */}
            {selectedCustomer && selectedCustomer.name?.trim() ? (
              <div className="w-full lg:w-auto p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-xs">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span>{selectedCustomer.name}</span>
                    <Badge variant="success" className="text-[10px]">
                      Selected
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {selectedCustomer.mobileNumber ? `Ph: ${selectedCustomer.mobileNumber}` : 'No phone specified'}{' '}
                    {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full lg:w-auto p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                    <span>Customer Name Required</span>
                    <Badge variant="destructive" className="text-[10px]">
                      Compulsory
                    </Badge>
                  </div>
                  <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                    Search customer, type name, or click <strong>+ New Customer</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product & Component Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-primary" />
                    <span>Product & Components Catalog</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Finished products and loose electronic spare parts available for billing.
                  </CardDescription>
                </div>

                {/* Barcode Quick Input + Reload */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Input
                    placeholder="Scan / Type barcode..."
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualBarcode.trim()) {
                        handleBarcodeScanned(manualBarcode.trim());
                        setManualBarcode('');
                      }
                    }}
                    className="h-8 w-full sm:w-40 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      if (manualBarcode.trim()) {
                        handleBarcodeScanned(manualBarcode.trim());
                        setManualBarcode('');
                      }
                    }}
                  >
                    Scan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      localStorage.removeItem('electro_inventory_items');
                      localStorage.removeItem('electro_finished_products');
                      localStorage.removeItem('electro_customers');
                      loadInitialData();
                    }}
                    title="Refresh stock & clear local cache"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Filter Tabs: All, Finished Products, Raw Components */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setCatalogFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    catalogFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Items ({catalogItems.length})
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogFilter('finished')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    catalogFilter === 'finished'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Finished Goods ({finishedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogFilter('components')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    catalogFilter === 'components'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Spare Parts ({componentsCount})</span>
                </button>
              </div>

              {/* Product search */}
              <div className="mt-3">
                <Input
                  placeholder="Filter by product name, component, code (e.g. Dol Auto Switch, Transformer)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  icon={<Search className="w-4 h-4 text-muted-foreground" />}
                />
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              {filteredCatalog.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-3">
                  <PackageX className="w-10 h-10 opacity-30 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-foreground">No Items in Catalog</h4>
                    <p className="text-xs max-w-sm mx-auto">
                      {productSearch
                        ? `No items match "${productSearch}".`
                        : 'No finished products or inventory components found in database.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {filteredCatalog.map((item) => {
                    const inStock = item.currentStock > 0;
                    const isFinished = item.itemType === 'finished_product';

                    return (
                      <div
                        key={item.id}
                        onClick={() => inStock && addToCart(item)}
                        className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                          inStock
                            ? 'border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer'
                            : 'border-border/50 bg-muted/40 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-bold text-foreground text-sm truncate leading-snug">
                              {item.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase tracking-wider shrink-0 font-bold ${
                                isFinished
                                  ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                                  : 'text-amber-500 border-amber-500/30 bg-amber-500/10'
                              }`}
                            >
                              {isFinished ? 'Finished Good' : 'Spare Component'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span className="font-mono">{item.code}</span>
                            <span>•</span>
                            <span className="truncate">{item.category}</span>
                          </div>

                          {item.description && (
                            <p className="text-muted-foreground text-[11px] mt-1 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-foreground">
                              {formatCurrency(item.sellingPrice)}
                              <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                /{item.unit}
                              </span>
                            </div>
                            <div className="text-[10px] flex items-center gap-1.5 flex-wrap">
                              {inStock ? (
                                <span className="text-emerald-500 font-semibold">
                                  {item.currentStock} {item.unit} in stock
                                </span>
                              ) : (
                                <span className="text-rose-500 font-semibold">Out of Stock</span>
                              )}
                              {(item.soldCount ?? 0) > 0 && (
                                <span className="text-blue-600 dark:text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded text-[9px] border border-blue-500/20">
                                  {item.soldCount} sold
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            disabled={!inStock}
                            className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Billing Cart & Tax Ledger (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-md">
            <CardHeader className="p-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Cart Items</CardTitle>
                </div>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-7"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 opacity-30 mx-auto mb-2" />
                  <p className="text-xs font-medium">Cart is empty.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Click products or spare parts on the left or scan barcode to add line items.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const lineTotal = item.sellingPrice * item.quantity;

                    return (
                      <div key={item.productId} className="py-2.5 text-xs space-y-2">
                        {/* Title & Delete button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm truncate">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1 text-muted-foreground"
                              >
                                {item.itemType === 'inventory_item' ? 'Spare' : 'Product'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.productCode}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price Input & Quantity Controls & Line Total */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          {/* User Editable Rate / Price */}
                          <div className="flex items-center gap-1" title="Editable Unit Selling Price">
                            <span className="text-muted-foreground text-xs font-bold">₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.sellingPrice}
                              onChange={(e) =>
                                updateCartPrice(
                                  item.productId,
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              className="w-20 h-7 text-xs font-bold text-foreground px-1.5 py-0 border-primary/40 focus:border-primary bg-background"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              /{item.unit || 'unit'}
                            </span>
                          </div>

                          {/* Quantity Counter */}
                          <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/40 shrink-0">
                            <button
                              onClick={() => updateCartQty(item.productId, -1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-foreground"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(item.productId, 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-foreground"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="font-bold text-sm text-foreground shrink-0 min-w-16 text-right">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total Summary */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Items Quantity</span>
                  <span className="font-semibold text-foreground">{totals.totalQuantity}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub Total</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Grand Total</span>
                  <span className="text-lg text-primary">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card POS</span>
                  </button>
                </div>
              </div>

              {/* Amount Paid & Balance Due */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Received (₹)</label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) =>
                      setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Balance Due (₹)</label>
                  <div className="h-8 px-3 rounded-md bg-muted/60 border border-border flex items-center font-bold text-sm text-foreground">
                    {formatCurrency(Math.max(0, totals.grandTotal - (Number(amountPaid) || 0)))}
                  </div>
                </div>
              </div>

              {/* Finalize Button */}
              <Button
                onClick={handleFinalizeInvoice}
                disabled={cart.length === 0 || !selectedCustomer || !selectedCustomer.name?.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-sm shadow-lg shadow-emerald-600/30 gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {!selectedCustomer || !selectedCustomer.name?.trim()
                    ? 'Enter Customer Name to Finalize'
                    : 'Finalize & Print Invoice'}
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Customer Modal */}
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogContent onClose={() => setIsNewCustomerOpen(false)}>
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">Customer Full Name *</label>
              <Input
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="e.g. Mohate Feter"
                required
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">
                Mobile Number (10 digits) *
              </label>
              <Input
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="e.g. 8975539613"
                required
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Billing Address</label>
              <Input
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="e.g. Dhamongaon Pat akole ahilyanagar"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">GSTIN (Optional)</label>
              <Input
                value={newCustGstin}
                onChange={(e) => setNewCustGstin(e.target.value)}
                placeholder="27XXXXX1234X1ZX"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewCustomerOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save & Select Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tax Invoice Printable Modal */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent
          className="max-w-4xl max-h-[95vh] overflow-y-auto p-4"
          onClose={() => setIsInvoiceModalOpen(false)}
        >
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Generated Tax Invoice</span>
              </DialogTitle>
              <Badge variant="success">Finalized & Saved</Badge>
            </div>
          </DialogHeader>

          {finalizedInvoice && (
            <div className="py-2">
              <InvoiceReceipt
                invoice={finalizedInvoice}
                onPrint={() => printInvoiceDocument('printable-tax-invoice', finalizedInvoice.invoiceNumber)}
              />
            </div>
          )}

          <DialogFooter className="print:hidden flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => printInvoiceDocument('printable-tax-invoice', finalizedInvoice?.invoiceNumber || '')}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Invoice</span>
            </Button>
            <Button size="sm" onClick={() => setIsInvoiceModalOpen(false)}>
              Close & New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
