'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CreditCard,
  Globe2,
  IndianRupee,
  Link2,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const actions = [
  {
    href: '/dashboard/payments',
    title: 'Payments hub',
    desc: 'Your rails only — India + cross-border on Advanced Pay',
    icon: IndianRupee,
    variant: 'default' as const,
  },
  {
    href: '/checkout/advanced',
    title: 'Advanced checkout',
    desc: 'GST, DPDP consent, INR & FX display (your stack)',
    icon: Globe2,
    variant: 'secondary' as const,
  },
  {
    href: '/checkout',
    title: 'Test hosted checkout',
    desc: 'Try your card, UPI, and net-banking flows',
    icon: CreditCard,
    variant: 'outline' as const,
  },
  {
    href: '/dashboard/payment-links',
    title: 'Payment links & QR',
    desc: 'Shareable links and QR — your analytics',
    icon: Link2,
    variant: 'outline' as const,
  },
  {
    href: '/dashboard/settings/payments',
    title: 'Your payment methods',
    desc: 'Turn rails on or off — no external PSP branding',
    icon: Settings2,
    variant: 'outline' as const,
  },
];

export function PaymentHubQuickLinks() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">India-first payments</CardTitle>
            <Badge variant="secondary" className="gap-1 font-semibold">
              <Sparkles className="h-3 w-3" />
              Your gateway
            </Badge>
          </div>
          <CardDescription>
            Checkout, links, and toggles all use <strong className="text-foreground">Advanced Pay</strong> rails you
            control — not a third-party wallet or PSP brand.
          </CardDescription>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-2">
          <Link href="/dashboard/payments">
            Open hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map(({ href, title, desc, icon: Icon, variant }) => (
            <Link key={href} href={href} className="group block rounded-xl border border-border/80 bg-card/50 p-4 transition hover:border-primary/40 hover:bg-card">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground group-hover:text-primary">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
