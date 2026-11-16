import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getInvoices, updateInvoice } from '@/services/billing.service';
import { Invoice, PaymentMethod, PaymentStatus } from '@/types/billing';
import { InvoiceReceipt, printInvoiceDocument } from '@/components/billing/InvoiceReceipt';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAppStore } from '@/store/app.store';
import {
  History,
  Printer,
  Receipt,
  Inbox,
  Edit3,
  CreditCard,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  User,
  ArrowRight,
} from 'lucide-react';

interface EditInvoiceDialogProps {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Invoice, shouldPrint: boolean) => void;
}

function EditInvoiceDialog({ invoice, open, onClose, onSaved }: EditInvoiceDialogProps) {
  const { addToast } = useAppStore();

  // Customer fields
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [customerMobile, setCustomerMobile] = useState(invoice?.customerMobile || '');
  const [customerAddress, setCustomerAddress] = useState(invoice?.customerAddress || '');
  const [customerGstin, setCustomerGstin] = useState(invoice?.customerGstin || '');

  // Payment update fields
  const [paymentModeType, setPaymentModeType] = useState<'add_payment' | 'direct_paid'>('add_payment');
  const [addPaymentAmount, setAddPaymentAmount] = useState<number | ''>('');
  const [directPaidAmount, setDirectPaidAmount] = useState<number | ''>(invoice?.amountPaid || 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(invoice?.paymentMethod || 'cash');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when invoice changes
  useEffect(() => {
    if (invoice) {
      setCustomerName(invoice.customerName || '');
      setCustomerMobile(invoice.customerMobile || '');
      setCustomerAddress(invoice.customerAddress || '');
      setCustomerGstin(invoice.customerGstin || '');
      setPaymentMethod(invoice.paymentMethod || 'cash');
      setNotes(invoice.notes || '');
      setAddPaymentAmount('');
      setDirectPaidAmount(invoice.amountPaid || 0);
      setPaymentModeType('add_payment');
    }
  }, [invoice]);

  if (!open || !invoice) return null;

  const grandTotal = invoice.grandTotal || 0;
  const currentPaid = invoice.amountPaid || 0;
  const currentBalance = invoice.balanceDue || 0;

  // Calculate new payment totals
  const newAmountPaid =
    paymentModeType === 'add_payment'
      ? Math.min(grandTotal, currentPaid + (Number(addPaymentAmount) || 0))
      : Math.min(grandTotal, Math.max(0, Number(directPaidAmount) || 0));

  const newBalanceDue = Math.max(0, grandTotal - newAmountPaid);
  const newStatus: PaymentStatus = newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';

  const handleSave = async (shouldPrint: boolean) => {
    if (!customerName.trim()) {
      addToast({
        title: 'Customer Name Compulsory',
        description: 'Customer name is compulsory for billing.',
        type: 'warning',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateInvoice(invoice.id, {
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerAddress: customerAddress.trim(),
        customerGstin: customerGstin.trim(),
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        paymentMethod,
        paymentStatus: newStatus,
        notes: notes.trim(),
      });

      addToast({
        title: 'Invoice Updated Successfully',
        description: `Invoice #${updated.invoiceNumber} updated. New Balance: ₹${updated.balanceDue.toFixed(2)}`,
        type: 'success',
      });

      onSaved(updated, shouldPrint);
    } catch (err: any) {
      addToast({
        title: 'Update Failed',
        description: err.message || 'Could not update invoice.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-5" onClose={onClose}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit3 className="w-5 h-5 text-amber-600" />
              <span>Edit Invoice #{invoice.invoiceNumber}</span>
            </DialogTitle>
            <Badge variant={invoice.balanceDue > 0 ? 'warning' : 'success'} className="text-xs">
              {invoice.balanceDue > 0 ? `Partially Paid (₹${invoice.balanceDue.toFixed(2)} Due)` : 'Fully Paid'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-xs mt-2">
          {/* Current Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl border border-border">
            <div className="p-2.5 rounded-lg bg-background border border-border">
              <div className="text-[11px] text-muted-foreground font-medium uppercase">Grand Total</div>
              <div className="text-base font-bold text-foreground mt-0.5">₹{grandTotal.toFixed(2)}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border">
              <div className="text-[11px] text-muted-foreground font-medium uppercase">Already Paid</div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">₹{currentPaid.toFixed(2)}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold uppercase">
                Current Balance Due
              </div>
              <div className="text-base font-black text-amber-600 mt-0.5">₹{currentBalance.toFixed(2)}</div>
            </div>
          </div>

          {/* Payment Collection & Balance Update Box */}
          <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Collect Due Payment / Update Paid Amount</span>
              </h4>
              <div className="flex items-center gap-1 bg-background border border-input rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setPaymentModeType('add_payment')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    paymentModeType === 'add_payment'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Add Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModeType('direct_paid')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    paymentModeType === 'direct_paid'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Edit Total Paid
                </button>
              </div>
            </div>

            {paymentModeType === 'add_payment' ? (
              <div className="space-y-2">
                <label className="font-medium text-foreground block">
                  Payment Amount Received Now (₹)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={currentBalance}
                    placeholder={`e.g. ${currentBalance}`}
                    value={addPaymentAmount}
                    onChange={(e) =>
                      setAddPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-9 font-bold text-sm"
                  />
                  {currentBalance > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setAddPaymentAmount(currentBalance)}
                      className="shrink-0 h-9 font-semibold text-xs bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-300"
                    >
                      Clear Full Balance (₹{currentBalance.toFixed(2)})
                    </Button>
                  )}
                </div>

                {/* Quick Add Pills */}
                {currentBalance > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-muted-foreground">Quick Add:</span>
                    {[500, 1000, 2000]
                      .filter((val) => val <= currentBalance)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAddPaymentAmount(val)}
                          className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-medium hover:border-primary text-foreground transition-colors"
                        >
                          +₹{val}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">
                  Total Amount Paid (₹) [Direct Override]
                </label>
                <Input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={directPaidAmount}
                  onChange={(e) =>
                    setDirectPaidAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="h-9 font-bold text-sm"
                />
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="font-medium text-foreground block mb-1">
                Payment Method for this Transaction
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'upi', 'card', 'bank_transfer'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold uppercase text-center transition-all ${
                      paymentMethod === method
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-background text-foreground border-input hover:bg-muted'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Recalculation Preview Banner */}
            <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between text-xs mt-2">
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Updated Total Paid:</span>
                <div className="font-bold text-sm text-foreground">₹{newAmountPaid.toFixed(2)}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Updated Balance Due:</span>
                <div className="font-black text-sm text-amber-600">₹{newBalanceDue.toFixed(2)}</div>
              </div>
              <Badge variant={newBalanceDue <= 0 ? 'success' : 'warning'} className="text-xs px-2.5 py-1">
                {newBalanceDue <= 0 ? 'PAID IN FULL (CLEAR)' : `PARTIAL (₹${newBalanceDue.toFixed(2)} DUE)`}
              </Badge>
            </div>
          </div>

          {/* Customer Details (Compulsory Customer Name) */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              <span>Customer Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Customer Full Name <span className="text-destructive font-bold">* Compulsory</span>
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Suresh Patil"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Phone Number</label>
                <Input
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="e.g. 8975539613"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Billing Address</label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Dhamongaon Pat akole"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">GSTIN (Optional)</label>
                <Input
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                  placeholder="27XXXXX0000X1Z5"
                />
              </div>
            </div>
          </div>

          {/* Payment Notes */}
          <div>
            <label className="font-medium text-foreground block mb-1">Payment Remarks / Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received ₹1,500 via GPay. Balance to be cleared next week."
            />
          </div>

          {/* Items on invoice summary */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border">
            <div className="font-semibold text-foreground text-xs mb-1.5">
              Items on this Invoice ({invoice.items?.length || 0}):
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto divide-y divide-border/60">
              {invoice.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-[11px]">
                  <span className="font-medium text-foreground">
                    {idx + 1}. {item.productName} × {item.quantity}
                  </span>
                  <span className="font-semibold text-muted-foreground">₹{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-5 gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isSaving || !customerName.trim()}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5 shadow"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Update Bill'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving || !customerName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Reprint Bill</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BillingHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    getInvoices().then(setInvoices);
  };

  const handleInvoiceUpdated = (updated: Invoice, shouldPrint: boolean) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updated.id || inv.invoiceNumber === updated.invoiceNumber ? updated : inv))
    );
    setEditingInvoice(null);
    if (shouldPrint) {
      setSelectedInvoice(updated);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice No',
      accessorKey: 'invoiceNumber',
      className: 'font-mono text-xs font-semibold text-primary',
    },
    {
      header: 'Customer',
      cell: (inv) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{inv.customerName}</div>
          <div className="text-[11px] text-muted-foreground">{inv.customerMobile ? `Ph: ${inv.customerMobile}` : ''}</div>
        </div>
      ),
    },
    {
      header: 'Items',
      cell: (inv) => `${inv.items?.length || 1} item(s)`,
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Grand Total',
      cell: (inv) => (
        <span className="font-bold text-xs text-foreground">
          {formatCurrency(inv.grandTotal)}
        </span>
      ),
    },
    {
      header: 'Payment Status',
      cell: (inv) => {
        const isPartial = inv.paymentStatus === 'partial' || inv.balanceDue > 0;
        return (
          <div className="space-y-1">
            <Badge variant={isPartial ? 'warning' : inv.paymentStatus === 'paid' ? 'success' : 'secondary'} className="text-[10px]">
              {isPartial ? 'PARTIALLY PAID' : inv.paymentStatus.toUpperCase()} ({inv.paymentMethod.toUpperCase()})
            </Badge>
            <div className="text-[10px] text-muted-foreground">
              Paid: <strong className="text-foreground">{formatCurrency(inv.amountPaid)}</strong>
              {isPartial && (
                <span className="text-amber-600 font-semibold ml-1">
                  (Due: {formatCurrency(inv.balanceDue)})
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Invoice Date',
      cell: (inv) => formatDate(inv.invoiceDate),
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Action',
      cell: (inv) => {
        const isPartial = inv.paymentStatus === 'partial' || inv.balanceDue > 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {isPartial && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-sm"
                onClick={() => setEditingInvoice(inv)}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit / Collect Due</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setSelectedInvoice(inv)}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reprint</span>
            </Button>
          </div>
        );
      },
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          <span>Store Billing & Receipt History</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Review finalized counter transactions, collect remaining payments on partially paid bills, and reprint tax invoices.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="p-12 text-center border-dashed border-2 rounded-xl text-muted-foreground space-y-2">
          <Inbox className="w-8 h-8 opacity-40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">No invoices generated yet</p>
          <p className="text-[11px]">Go to POS Billing Terminal to generate customer bills.</p>
        </div>
      ) : (
        <DataTable
          data={invoices}
          columns={columns}
          searchPlaceholder="Search by invoice number or customer phone..."
          searchFilter={(inv, q) =>
            Boolean(
              inv.invoiceNumber.toLowerCase().includes(q) ||
              inv.customerName.toLowerCase().includes(q) ||
              inv.customerMobile.includes(q)
            )
          }
        />
      )}

      {/* Edit Partially Paid Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceDialog
          key={editingInvoice.id || editingInvoice.invoiceNumber}
          invoice={editingInvoice}
          open={!!editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={handleInvoiceUpdated}
        />
      )}

      {/* Reprint Invoice Modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4" onClose={() => setSelectedInvoice(null)}>
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <span>Tax Invoice Reprint</span>
              </DialogTitle>
            </div>
          </DialogHeader>

          {selectedInvoice && (
            <div className="py-2">
              <InvoiceReceipt
                invoice={selectedInvoice}
                onPrint={() => printInvoiceDocument('printable-tax-invoice', selectedInvoice.invoiceNumber)}
              />
            </div>
          )}

          <DialogFooter className="print:hidden flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => printInvoiceDocument('printable-tax-invoice', selectedInvoice?.invoiceNumber || '')}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Invoice</span>
            </Button>
            <Button size="sm" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
