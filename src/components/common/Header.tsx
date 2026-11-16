import React from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAppStore } from '@/store/app.store';
import { logout } from '@/services/auth.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Menu,
  LogOut,
  Receipt,
  Store,
  Clock,
  User,
} from 'lucide-react';

export function Header() {
  const { user, logout: storeLogout } = useAuthStore();
  const { toggleSidebar } = useAppStore();
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    storeLogout();
  };

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left side: Hamburger toggle + Store Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-foreground">
              {import.meta.env.VITE_STORE_NAME || 'Kotuleshwar Electronics'}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {import.meta.env.VITE_STORE_ADDRESS || 'Dhamongaon Pat akole ahilyanagar'}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-border">
          <Badge
            variant="outline"
            className="text-xs px-2.5 py-0.5 font-bold gap-1.5 text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Billing POS Terminal</span>
          </Badge>
        </div>
      </div>

      {/* Right side: Live Clock + Role Indicator + User Profile + Logout */}
      <div className="flex items-center gap-4">
        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border border-border/50">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {time.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            })}{' '}
            • {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Role Badge */}
        <Badge
          variant="success"
          className="px-3 py-1 text-xs gap-1.5 font-semibold"
        >
          <Receipt className="w-3.5 h-3.5" />
          POS CASHIER
        </Badge>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-semibold text-xs">
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-tight text-foreground">
              {user?.displayName || 'Cashier Station'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {user?.email || 'billing@kotuleshwar.com'}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 h-8 px-2.5 text-xs gap-1.5"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
