import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmailPassword } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('billing@kotuleshwar.com');
  const [password, setPassword] = useState('store123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const appUser = await loginWithEmailPassword(email, password);
      setUser(appUser);
      navigate('/billing', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden select-none">
      {/* Circuit background with emerald ambient glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/20 border border-emerald-400/30 mb-3">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Kotuleshwar Billing & POS</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">
            Counter Sales & Tax Invoicing Terminal
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Cashier Sign In</CardTitle>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                POS Billing Station
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Sign in to generate tax invoices, process counter sales, and reprint receipts.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Cashier Login / Email</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@kotuleshwar.com"
                    icon={<Mail className="w-4 h-4 text-slate-500" />}
                    className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Station Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4 text-slate-500" />}
                    className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2 shadow-lg shadow-emerald-600/30 gap-2 mt-2 cursor-pointer"
              >
                <span>Open Billing Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-3 border-t border-slate-800/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLogin()}
                disabled={isLoading}
                className="w-full text-xs border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick 1-Click Cashier Sign In</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-slate-500">
          <span>Kotuleshwar Electronics • Dhamongaon Pat akole ahilyanagar</span>
        </div>
      </div>
    </div>
  );
}
