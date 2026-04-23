'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldAlert, FileCheck2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/admin/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/admin/operations', label: 'Operations', icon: FileCheck2 },
] as const;

export function AdminNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-xl border border-border/50 bg-muted/30 p-1',
        className
      )}
      aria-label="Admin sections"
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
