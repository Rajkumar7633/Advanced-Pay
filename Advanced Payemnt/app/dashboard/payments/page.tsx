'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CreditCard,
  Globe2,
  IndianRupee,
  Link2,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const indiaRails = [
  {
    name: 'UPI (your rail)',
    detail: 'Collect, intent, and QR — processed entirely on your Advanced Pay UPI stack.',
    icon: Smartphone,
    href: '/checkout',
    cta: 'Try hosted checkout',
  },
  {
    name: 'Cards (your rail)',
    detail: 'Domestic debit/credit through your gateway — tokenize and route as you define.',
    icon: CreditCard,
    href: '/checkout/advanced',
    cta: 'Advanced checkout',
  },
  {
    name: 'Net banking',
    detail: 'Bank redirect flows you host — tune for B2B invoices and large tickets.',
    icon: Building2,
    href: '/dashboard/settings/payments',
    cta: 'Toggle in settings',
  },
  {
    name: 'Platform wallet',
    detail: 'Customer balance or stored value on Advanced Pay — no external wallet brand.',
    icon: Wallet,
    href: '/dashboard/settings/payments',
    cta: 'Enable wallet rail',
  },
];

const globalRails = [
  {
    name: 'Cross-border card',
    detail: 'International card presentation and FX display — your acquirer rules, Advanced Pay checkout.',
    icon: CreditCard,
  },
  {
    name: 'Cross-border wallet',
    detail: 'Your own international stored-balance or wallet rail (same brand as checkout).',
    icon: Globe2,
  },
  {
    name: 'Device quick-pay',
    detail: 'Optional one-tap — implement with your tokens and device binding, not a third-party button.',
    icon: Smartphone,
  },
];

export default function DashboardPaymentsHubPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/15 text-primary">Merchant</Badge>
          <Badge variant="outline">India-first</Badge>
          <Badge variant="outline">Global-ready</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Payments hub</h1>
        <p className="max-w-3xl text-muted-foreground">
          Every method here is <strong className="text-foreground">yours</strong>: Advanced Pay checkout, routing, and
          rails — no dependency on another company&apos;s branded wallet or checkout. Use the links below to test,
          share payment links, and switch rails on or off.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/checkout/advanced" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Advanced checkout (IN + world)
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/checkout">Standard checkout</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/payment-links" className="gap-2">
              <Link2 className="h-4 w-4" />
              Payment links
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/settings/payments">Payment method settings</Link>
          </Button>
        </div>
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Domestic — priority stack
            </CardTitle>
            <CardDescription>Optimized for Indian success rates and compliance (GST, DPDP on advanced flow).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {indiaRails.map(({ name, detail, icon: Icon, href, cta }) => (
              <div
                key={name}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1">
                  <Link href={href}>
                    {cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe2 className="h-5 w-5 text-blue-600" />
              International
            </CardTitle>
            <CardDescription>Enable these rails in settings when your backend is ready — all under your brand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {globalRails.map(({ name, detail, icon: Icon }) => (
              <div key={name} className="flex gap-3 rounded-xl border border-border/60 bg-background/80 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
            <Button asChild className="w-full">
              <Link href="/checkout/advanced">Open global-ready checkout</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Developer paths</CardTitle>
          <CardDescription>Wire these URLs into your site or app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 font-mono text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-muted-foreground">Hosted — </span>
            <span className="text-foreground">/checkout</span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-muted-foreground">Advanced — </span>
            <span className="text-foreground">/checkout/advanced</span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-muted-foreground">Embed — </span>
            <span className="text-foreground">/checkout/embed</span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-muted-foreground">API keys — </span>
            <span className="text-foreground">/dashboard/settings/api</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
