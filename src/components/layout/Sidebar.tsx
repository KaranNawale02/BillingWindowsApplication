import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/app.store';
import { cn } from '@/lib/utils';
import {
  Receipt,
  Users,
  History,
  ShoppingBag,
} from 'lucide-react';

export function Sidebar() {
  const { isSidebarCollapsed } = useAppStore();

  const navGroups = [
    {
      group: 'Point of Sale (POS)',
      items: [
        {
          title: 'Billing Terminal',
          path: '/billing',
          icon: <Receipt className="w-4 h-4 shrink-0" />,
        },
        {
          title: 'Billing History',
          path: '/billing/history',
          icon: <History className="w-4 h-4 shrink-0" />,
        },
        {
          title: 'Customer Directory',
          path: '/customers',
          icon: <Users className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-all duration-300 z-30 shrink-0 select-none',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
          <Receipt className="w-5 h-5" />
        </div>
        {!isSidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-tight text-white truncate">
              Kotuleshwar
            </span>
            <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase truncate">
              Billing & POS Terminal
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {group.group}
              </div>
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/billing'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70',
                    isSidebarCollapsed && 'justify-center px-0'
                  )
                }
                title={isSidebarCollapsed ? item.title : undefined}
              >
                {item.icon}
                {!isSidebarCollapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
