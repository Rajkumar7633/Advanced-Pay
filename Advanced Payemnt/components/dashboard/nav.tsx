'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  TrendingUp,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Building,
  DollarSign,
  TerminalSquare,
  Scale,
  Repeat,
  IndianRupee,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: IndianRupee, label: 'Payments', href: '/dashboard/payments' },
  { icon: CreditCard, label: 'Transactions', href: '/dashboard/transactions' },
  { icon: Repeat, label: 'Subscriptions', href: '/dashboard/subscriptions' },
  { icon: TrendingUp, label: 'Analytics', href: '/dashboard/analytics' },
  { icon: Zap, label: 'Payment Links', href: '/dashboard/payment-links' },
  { icon: Users, label: 'Customers', href: '/dashboard/customers' },
  { icon: Building, label: 'Banking', href: '/dashboard/banking' },
  { icon: DollarSign, label: 'Settlements', href: '/dashboard/settlements' },
  { icon: Scale, label: 'Disputes', href: '/dashboard/disputes' },
  { icon: TerminalSquare, label: 'Developers', href: '/dashboard/developers' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
] as const;

/** Home dashboard is only active on `/dashboard`, not on every `/dashboard/*` route. */
function isNavActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const linkClass = (active: boolean) =>
    cn(
      'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
    );

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Advanced Pay</span>
          </Link>

          <div className="hidden min-w-0 flex-1 md:flex md:justify-center">
            <div
              className="flex max-w-full items-center gap-0.5 overflow-x-auto py-1 [scrollbar-width:thin]"
              aria-label="Primary navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={linkClass(active)} title={item.label}>
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
                {user?.name || user?.email || 'Merchant'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
              >
                <LogOut className="mr-1 h-4 w-4" />
                Logout
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="md:hidden" aria-expanded={isOpen}>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-border md:hidden">
            <div className="mx-auto max-h-[min(70vh,calc(100dvh-3.5rem))] space-y-0.5 overflow-y-auto px-4 py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="mt-2 w-full justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
