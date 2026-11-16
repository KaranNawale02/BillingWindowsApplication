import React, { useEffect } from 'react';
import { Invoice } from '@/types/billing';
import { formatCurrency, formatDate, numberToWordsINR } from '@/lib/utils';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceReceiptProps {
  invoice: Invoice;
  onPrint?: () => void;
}

/**
 * Utility to print the invoice cleanly via an isolated invisible iframe.
 * This guarantees the browser print engine only receives the invoice document,
 * preventing any modal, backdrop, overflow clipping, or white-page issues.
 */
export function printInvoiceDocument(elementId: string = 'printable-tax-invoice', invoiceNumber: string = '') {
  const invoiceElement = document.getElementById(elementId);
  if (!invoiceElement) {
    window.print();
    return;
  }

  // Create an isolated invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Clone all styles from the current document
  const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
  const stylesHtml = styleNodes.map((node) => node.outerHTML).join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Tax Invoice - ${invoiceNumber || 'Kotuleshwar'}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
            height: auto !important;
          }
          .invoice-a4-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 190mm; margin: 0 auto;">
          ${invoiceElement.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Allow styles to apply then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }, 2000);
    }
  }, 250);
}

export function InvoiceReceipt({ invoice, onPrint }: InvoiceReceiptProps) {
  const store = invoice.storeDetails || {
    name: 'Kotuleshwar Electronics',
    address: 'Dhamongaon Pat akole ahilyanagar',
    phone: '8975539613',
    email: 'nsksaiauto@gmail.com',
    gstin: '27AAAAA0000A1Z5',
    logoUrl: '/logo.png',
  };
  const storeGstin = store.gstin || invoice.storeDetails?.gstin || '27AAAAA0000A1Z5';

  const totalQuantity = invoice.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const amountInWords = numberToWordsINR(invoice.grandTotal);

  // Auto add/remove printing isolation class on window.print() or Ctrl+P
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-tax-invoice');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-tax-invoice');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-tax-invoice');
    };
  }, []);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      printInvoiceDocument('printable-tax-invoice', invoice.invoiceNumber);
    }
  };

  // Filler rows to ensure consistent full-page A4 height
  const fillerCount = Math.max(0, 8 - (invoice.items?.length || 0));

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top action bar (hidden on print) */}
      <div className="w-full max-w-[190mm] flex items-center justify-between mb-4 p-2 bg-muted/40 rounded-lg border border-border print:hidden">
        <span className="text-xs text-muted-foreground font-medium">
          Invoice #{invoice.invoiceNumber} • Exact A4 Page Size
        </span>
        <Button
          size="sm"
          onClick={handlePrint}
          className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow"
        >
          <Printer className="w-4 h-4" />
          <span>Print Tax Invoice (A4)</span>
        </Button>
      </div>

      {/* Tax Invoice Document Container - Exact A4 Page */}
      <div id="printable-tax-invoice-area" className="w-full max-w-[190mm]">
        <div
          id="printable-tax-invoice"
          className="invoice-a4-page w-full bg-white text-black p-5 font-sans text-xs shadow-md border-2 border-gray-900 box-border flex flex-col justify-between print:shadow-none print:m-0"
          style={{ minHeight: '268mm', maxHeight: '272mm' }}
        >
          <div>
            {/* Top Centered Title */}
            <div className="text-center pb-2">
              <h1 className="text-base font-extrabold tracking-wider text-gray-900 uppercase">
                Tax Invoice
              </h1>
            </div>

            {/* Outer Box */}
            <div className="border border-gray-900 flex flex-col">
              {/* Header Row: Logo + Store Info */}
              <div className="flex items-center p-3 border-b border-gray-900 gap-4">
                {/* Store Logo */}
                <div className="w-28 h-16 flex items-center justify-center shrink-0 border border-gray-300 p-1 bg-white">
                  <img
                    src={store.logoUrl || '/logo.png'}
                    alt="Store Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="hidden text-[10px] font-bold text-blue-700 tracking-wider">
                    KOTULESHWAR
                  </span>
                </div>

                {/* Store Title & Contact */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">
                    {store.name}
                  </h2>
                  <p className="text-xs text-gray-700 mt-0.5">{store.address}</p>
                  <div className="text-[11px] text-gray-800 mt-1 font-medium space-y-0.5">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>
                        <strong>Phone:</strong> {store.phone}
                      </span>
                      {store.email && (
                        <span>
                          <strong>Email:</strong> {store.email}
                        </span>
                      )}
                    </div>
                    {storeGstin && (
                      <div>
                        <strong>GSTIN:</strong> {storeGstin}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill To & Invoice Details Section */}
              <div className="grid grid-cols-2 border-b border-gray-900 text-xs">
                {/* Left: Bill To */}
                <div className="p-3 border-r border-gray-900">
                  <div className="font-semibold text-gray-600 uppercase text-[11px]">Bill To:</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">
                    {invoice.customerName || 'Cash Customer'}
                  </div>
                  {invoice.customerMobile && (
                    <div className="text-gray-700 mt-0.5">
                      <strong>Phone:</strong> {invoice.customerMobile}
                    </div>
                  )}
                  {invoice.customerAddress && (
                    <div className="text-gray-700 mt-0.5">{invoice.customerAddress}</div>
                  )}
                  {invoice.customerGstin && (
                    <div className="text-gray-700 mt-0.5">
                      <strong>GSTIN:</strong> {invoice.customerGstin}
                    </div>
                  )}
                </div>

                {/* Right: Invoice Details */}
                <div className="p-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-600 uppercase text-[11px]">
                      Invoice Details:
                    </div>
                    <div>
                      <strong className="text-gray-900">Invoice No:</strong>{' '}
                      <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <strong className="text-gray-900">Date:</strong>{' '}
                      <span className="text-gray-900 font-medium">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    {invoice.paymentMethod && (
                      <div>
                        <strong className="text-gray-900">Payment Mode:</strong>{' '}
                        <span className="uppercase font-semibold text-gray-900">
                          {invoice.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table (HSN/SAC column removed) */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-900 bg-gray-100 text-xs font-bold text-gray-900 uppercase">
                    <th className="py-2 px-2 border-r border-gray-900 text-center w-12">#</th>
                    <th className="py-2 px-3 border-r border-gray-900">Item Name</th>
                    <th className="py-2 px-2 border-r border-gray-900 text-center w-24">Quantity</th>
                    <th className="py-2 px-3 border-r border-gray-900 text-right w-32">
                      Price/ Unit (₹)
                    </th>
                    <th className="py-2 px-3 text-right w-36">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((line, idx) => (
                      <tr key={idx} className="text-xs">
                        <td className="py-2 px-2 border-r border-gray-900 text-center text-gray-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-gray-900 font-semibold text-gray-900">
                          {line.productName}
                        </td>
                        <td className="py-2 px-2 border-r border-gray-900 text-center font-medium">
                          {line.quantity}
                        </td>
                        <td className="py-2 px-3 border-r border-gray-900 text-right font-medium">
                          ₹ {line.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          ₹ {line.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500 text-xs">
                        No items on invoice.
                      </td>
                    </tr>
                  )}

                  {/* Filler rows to give consistent full A4 page height */}
                  {Array.from({ length: fillerCount }).map((_, i) => (
                    <tr key={`filler-${i}`} className="h-7">
                      <td className="border-r border-gray-900">&nbsp;</td>
                      <td className="border-r border-gray-900">&nbsp;</td>
                      <td className="border-r border-gray-900">&nbsp;</td>
                      <td className="border-r border-gray-900">&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}

                  {/* Total Row */}
                  <tr className="border-t-2 border-gray-900 font-bold text-xs bg-gray-100">
                    <td
                      colSpan={2}
                      className="py-2 px-3 border-r border-gray-900 text-right uppercase tracking-wider text-gray-700"
                    >
                      Total Quantity
                    </td>
                    <td className="py-2 px-2 border-r border-gray-900 text-center font-extrabold text-gray-900">
                      {totalQuantity}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-900 text-right uppercase text-gray-700">
                      Total
                    </td>
                    <td className="py-2 px-3 text-right font-black text-sm text-gray-900">
                      ₹ {invoice.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Summary Section */}
              <div className="grid grid-cols-12 border-t border-gray-900 text-xs">
                {/* Left: Words, Terms */}
                <div className="col-span-7 p-3 border-r border-gray-900 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-gray-600 text-[11px] uppercase">
                      Invoice Amount In Words :
                    </div>
                    <div className="font-bold text-gray-900 text-xs leading-tight mt-1 capitalize">
                      {amountInWords}
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-600 mt-4 leading-relaxed">
                    <strong>Terms & Conditions:</strong>
                    <br />
                    1. Goods once sold will not be taken back without original invoice.
                    <br />
                    2. Warranty as per manufacturer terms. Subject to local jurisdiction.
                  </div>
                </div>

                {/* Right: Subtotal, GST, Total, Paid, Balance */}
                <div className="col-span-5 divide-y divide-gray-300 text-xs">
                  <div className="flex justify-between py-1.5 px-3">
                    <span className="font-semibold text-gray-700">Sub Total</span>
                    <span className="font-bold">₹ {invoice.subtotal.toFixed(2)}</span>
                  </div>

                  {invoice.totalGst > 0 && (
                    <div className="flex justify-between py-1.5 px-3 text-gray-700">
                      <span>GST Total</span>
                      <span>₹ {invoice.totalGst.toFixed(2)}</span>
                    </div>
                  )}

                  {invoice.totalDiscount > 0 && (
                    <div className="flex justify-between py-1.5 px-3 text-emerald-600 font-medium">
                      <span>Discount</span>
                      <span>-₹ {invoice.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 px-3 bg-gray-100 font-black text-gray-900 border-t border-b border-gray-900 text-sm">
                    <span>Grand Total</span>
                    <span>₹ {invoice.grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 px-3">
                    <span className="text-gray-700">Amount Received</span>
                    <span className="font-semibold">₹ {invoice.amountPaid.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 px-3 font-bold text-gray-900">
                    <span>Balance Due</span>
                    <span>₹ {invoice.balanceDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Signatory Bar */}
          <div className="flex justify-between items-end pt-3 mt-2">
            <div className="text-[10px] text-gray-500 italic">
              * This is a computer generated invoice and requires no physical stamp.
            </div>

            <div className="w-64 border border-gray-900 p-2 text-right bg-white">
              <div className="text-xs font-bold text-gray-900 mb-1">
                For {store.name}:
              </div>

              <div className="h-12 flex items-center justify-center my-1">
                <img
                  src="/signature.png"
                  alt="Authorized Signatory"
                  className="max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="text-[11px] font-semibold text-gray-700 border-t border-gray-400 pt-1 text-center">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
