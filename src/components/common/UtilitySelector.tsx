import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Boxes, Receipt, ArrowRight, Sparkles, Store, Layers, Cpu, Wrench } from 'lucide-react';
import { setActiveUtility } from '@/lib/utilityConfig';

interface UtilitySelectorProps {
  onSelect?: (utility: 'inventory' | 'billing') => void;
}

export function UtilitySelector({ onSelect }: UtilitySelectorProps) {
  const storeName = import.meta.env.VITE_STORE_NAME || 'Kotuleshwar Electronics';
  const storeAddress = import.meta.env.VITE_STORE_ADDRESS || 'Dhamongaon Pat akole ahilyanagar';

  const handleChoose = (utility: 'inventory' | 'billing') => {
    setActiveUtility(utility);
    if (onSelect) {
      onSelect(utility);
    } else {
      window.location.hash = utility === 'inventory' ? '#/dashboard' : '#/billing';
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 shadow-lg">
            <Store className="w-3.5 h-3.5 text-blue-400" />
            <span>{storeName} • {storeAddress}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Choose Software Utility
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Please select the dedicated software station you wish to launch. Each station runs completely independently for maximum speed and simplicity.
          </p>
        </div>

        {/* Two Utility Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Utility 1: Inventory Management */}
          <Card className="border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-blue-500/50 transition-all duration-300 shadow-2xl flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            onClick={() => handleChoose('inventory')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all" />
            
            <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between relative z-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-500/20">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-[11px] text-blue-400 border-blue-500/30 bg-blue-500/10">
                    Software Utility 1
                  </Badge>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                    Inventory Manager
                  </h2>
                  <p className="text-xs text-blue-400/90 font-medium mt-0.5">
                    Raw Materials, Stock & Production Control
                  </p>
                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                    Designed for warehouse & production managers. Manage electronic components, assembly BOM recipes, daily manufacturing batches, and product repairs.
                  </p>
                </div>

                {/* Feature highlights */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    <span>Raw Materials & Component Stock Ledgers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Bill of Materials (BOM) & Daily Production</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    <span>Product Repairs & Servicing Logs</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 shadow-lg shadow-blue-600/30 gap-2 group-hover:translate-x-1 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoose('inventory');
                  }}
                >
                  <span>Launch Inventory Manager</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Utility 2: Billing & POS */}
          <Card className="border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-emerald-500/50 transition-all duration-300 shadow-2xl flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            onClick={() => handleChoose('billing')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
            
            <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between relative z-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-lg shadow-emerald-500/20">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Software Utility 2
                  </Badge>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Billing & POS Terminal
                  </h2>
                  <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                    Fast Counter Sales & Tax Invoicing
                  </p>
                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                    Designed for cashier & store operators. Showcase both finished goods and loose components, edit line item prices on the fly, and print instant Tax Invoices.
                  </p>
                </div>

                {/* Feature highlights */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Catalog: Finished Goods + Raw Components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Editable Item Rates & Real-Time Recalculation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Automatic Stock Deduction & A4/Thermal Receipt</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 shadow-lg shadow-emerald-600/30 gap-2 group-hover:translate-x-1 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoose('billing');
                  }}
                >
                  <span>Launch Billing POS Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500">
          <span>Kotuleshwar Electronics Dual Utility Architecture • Windows 7 32-bit & 64-bit Compatible</span>
        </div>
      </div>
    </div>
  );
}
