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
  ChevronDown,
  Building,
  DollarSign,
  TerminalSquare,
  Scale,
  Repeat
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
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
];

export default function DashboardNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-card sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">PaymentGateway</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={isActive ? 'bg-accent text-accent-foreground' : ''}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* User Menu & Mobile Menu Toggle */}
            <div className="flex items-center gap-4">
              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center gap-2 border-l border-border pl-4">
                <span className="text-sm font-medium text-foreground">{user?.name || user?.email || 'Merchant'}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700 hover:bg-neutral-800"
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
              
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-card'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-neutral-800"
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
