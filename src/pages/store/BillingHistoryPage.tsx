import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getInvoices } from '@/services/billing.service';
import { Invoice } from '@/types/billing';
import { InvoiceReceipt, printInvoiceDocument } from '@/components/billing/InvoiceReceipt';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { History, Printer, Receipt, Inbox } from 'lucide-react';

export function BillingHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    getInvoices().then(setInvoices);
  }, []);

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
      cell: (inv) => (
        <Badge variant={inv.paymentStatus === 'paid' ? 'success' : 'warning'}>
          {inv.paymentStatus.toUpperCase()} ({inv.paymentMethod.toUpperCase()})
        </Badge>
      ),
    },
    {
      header: 'Invoice Date',
      cell: (inv) => formatDate(inv.invoiceDate),
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Action',
      cell: (inv) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setSelectedInvoice(inv)}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Reprint Bill</span>
        </Button>
      ),
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
          Review finalized counter transactions, verify amounts, and reprint tax invoices.
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
