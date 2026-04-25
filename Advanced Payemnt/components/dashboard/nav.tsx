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
  Building,
  DollarSign,
  TerminalSquare,
  Scale,
  Repeat,
  IndianRupee,
  Network,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Organize links by context
const linkGroups = [
  {
    category: "Overview",
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: TrendingUp, label: 'Analytics', href: '/dashboard/analytics' },
    ]
  },
  {
    category: "Operations",
    items: [
      { icon: IndianRupee, label: 'Payments', href: '/dashboard/payments' },
      { icon: CreditCard, label: 'Transactions', href: '/dashboard/transactions' },
      { icon: Zap, label: 'Payment Links', href: '/dashboard/payment-links' },
      { icon: Repeat, label: 'Subscriptions', href: '/dashboard/subscriptions' },
      { icon: Users, label: 'Customers', href: '/dashboard/customers' },
    ]
  },
  {
    category: "Architecture",
    items: [
      { icon: Network, label: 'Smart Routing', href: '/dashboard/routing' },
      { icon: TerminalSquare, label: 'Developer Studio', href: '/dashboard/developers' },
      { icon: Scale, label: 'Disputes Radar', href: '/dashboard/disputes' },
    ]
  },
  {
    category: "System",
    items: [
      { icon: DollarSign, label: 'Settlements', href: '/dashboard/settlements' },
      { icon: Building, label: 'Banking', href: '/dashboard/banking' },
      { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    ]
  }
];

function isNavActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-[280px] bg-[#0a0a0a] border-r border-slate-800 flex flex-col h-full shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20">
       
       {/* Brand Header */}
       <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white uppercase font-mono">Advanced Pay</span>
          </Link>
       </div>

       {/* Scrollable Nav Area */}
       <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* User Profile */}
          <div className="flex items-center gap-3 px-2">
             <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white shadow-inner">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'M'}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'Enterprise Merchant'}</p>
                <p className="text-xs text-slate-500 truncate font-mono">{user?.email || 'admin@advancedpay.com'}</p>
             </div>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-6">
             {linkGroups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-3 pb-1">
                      {group.category}
                   </h4>
                   <div className="space-y-1">
                      {group.items.map((item) => {
                         const active = isNavActive(pathname, item.href);
                         const Icon = item.icon;
                         return (
                            <Link 
                               key={item.href} 
                               href={item.href}
                               className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden",
                                  active 
                                    ? "bg-slate-800/50 text-white font-medium" 
                                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                               )}
                            >
                               {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_blue]" />}
                               <Icon className={cn("w-4 h-4", active ? "text-blue-500" : "opacity-70 group-hover:opacity-100")} />
                               {item.label}
                            </Link>
                         );
                      })}
                   </div>
                </div>
             ))}
          </nav>
       </div>

       {/* Footer Action */}
       <div className="p-4 border-t border-slate-800 shrink-0">
          <Button 
             variant="ghost" 
             className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 justify-start"
             onClick={logout}
          >
             <LogOut className="w-4 h-4 mr-3" />
             Disengage Access
          </Button>
       </div>
       
    </aside>
  );
}
