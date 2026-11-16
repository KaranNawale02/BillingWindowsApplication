import React from 'react';
import { Cpu } from 'lucide-react';

export function LoadingScreen({ message = 'Initializing ElectroStore Pro...' }: { message?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 select-none">
      <div className="relative flex items-center justify-center">
        {/* Glowing ring animation */}
        <div className="absolute w-24 h-24 rounded-full border-2 border-blue-500/30 animate-ping" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <Cpu className="w-8 h-8 text-white animate-pulse" />
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center">
        <h2 className="text-xl font-bold tracking-tight text-white">ElectroStore Pro</h2>
        <p className="text-xs text-blue-400 font-medium tracking-wide uppercase mt-1">
          Inventory & Billing Management
        </p>
        <div className="flex items-center gap-2 mt-4 text-slate-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
