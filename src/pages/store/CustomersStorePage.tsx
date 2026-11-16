import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCustomers, createCustomer } from '@/services/customer.service';
import { Customer } from '@/types/billing';
import { useAuthStore } from '@/store/auth.store';
import { useAppStore } from '@/store/app.store';
import { Users, Plus, Phone } from 'lucide-react';

export function CustomersStorePage() {
  const { user } = useAuthStore();
  const { addToast } = useAppStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const list = await getCustomers();
    setCustomers(list);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createCustomer({
        name,
        mobileNumber: phone,
        address,
        gstin,
        createdBy: user?.id || 'store-usr-002',
        userRole: 'store_user',
      });

      addToast({
        title: 'Customer Added',
        description: `Customer ${created.name} (${created.mobileNumber}) registered.`,
        type: 'success',
      });

      setIsModalOpen(false);
      setName('');
      setPhone('');
      setAddress('');
      setGstin('');
      loadCustomers();
    } catch (err: any) {
      addToast({
        title: 'Registration Error',
        description: err.message,
        type: 'error',
      });
    }
  };

  const columns: Column<Customer>[] = [
    {
      header: 'Customer ID',
      accessorKey: 'customerId',
      className: 'font-mono text-xs font-semibold text-primary',
    },
    {
      header: 'Customer Name',
      cell: (c) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{c.name}</div>
          <div className="text-[11px] text-muted-foreground">{c.address || 'Address not registered'}</div>
        </div>
      ),
    },
    {
      header: 'Mobile (Normalized)',
      cell: (c) => (
        <span className="text-xs font-mono font-medium flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
          {c.mobileNumber}
        </span>
      ),
    },
    {
      header: 'Purchases Count',
      cell: (c) => (
        <Badge variant="outline" className="text-xs">
          {c.totalPurchases} orders
        </Badge>
      ),
    },
    {
      header: 'Lifetime Value',
      cell: (c) => (
        <span className="font-bold text-xs text-foreground">
          {formatCurrency(c.totalPurchaseAmount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Store Customer Lookup & Registration</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Search existing customer profiles for POS checkout or register new retail clients.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs">
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </Button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        searchPlaceholder="Lookup by mobile number or name..."
        searchFilter={(c, q) =>
          Boolean(
            c.name.toLowerCase().includes(q) ||
            c.mobileNumber.includes(q) ||
            (c.gstin && c.gstin.toLowerCase().includes(q))
          )
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Register Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">Full Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Mahindra"
                required
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">10-Digit Mobile Number *</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9845011223"
                required
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Billing Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, City, PIN"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">GSTIN (Optional)</label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="29XXXXX1234X1ZX"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Register Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
