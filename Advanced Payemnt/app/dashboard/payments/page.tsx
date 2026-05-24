'use client';

import Link from 'next/link';
import {
  ArrowLeft, ArrowRight,
  Building2, CreditCard,
  Globe2, IndianRupee,
  Link2, Smartphone,
  Sparkles, Wallet,
  Zap, Activity, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UnifiedVirtualTerminal from '@/components/dashboard/unified-terminal';

// ─── Static content sections ──────────────────────────────────────────────────

const indiaRails = [
  {
    name: 'UPI (your rail)',
    detail: 'Collect, intent, and QR — processed entirely on your Advanced Pay UPI stack via NPCI.',
    icon: Smartphone,
    href: '/checkout',
    cta: 'Try hosted checkout',
    badge: 'NPCI',
  },
  {
    name: 'Cards (your rail)',
    detail: 'Domestic debit/credit through your gateway — AI-routed to best acquirer per transaction.',
    icon: CreditCard,
    href: '/checkout/advanced',
    cta: 'Advanced checkout',
    badge: 'AI-Routed',
  },
  {
    name: 'Net Banking',
    detail: 'Bank redirect flows you host — tuned for B2B invoices and large ticket amounts.',
    icon: Building2,
    href: '/checkout',
    cta: 'Try checkout',
    badge: null,
  },
  {
    name: 'Platform Wallet',
    detail: 'Advanced Pay stored-value wallet — instant, zero-fee internal transfers between your users.',
    icon: Wallet,
    href: '/dashboard/settings',
    cta: 'Configure wallet',
    badge: null,
  },
];

const globalRails = [
  {
    name: 'Cross-border Card',
    detail: 'International card presentation and FX display — your acquirer rules, Advanced Pay checkout.',
    icon: CreditCard,
  },
  {
    name: 'Cross-border Wallet',
    detail: 'Your international stored-balance or wallet rail (same brand as checkout).',
    icon: Wallet,
  },
  {
    name: 'Multi-currency Settlement',
    detail: '15+ currencies auto-converted to INR at live FX rates. Global Gateway for INTL fallback.',
    icon: Globe2,
  },
];

const providerCards = [
  { name: 'UPI Rail',          icon: '🇮🇳', desc: 'Native India UPI — 100% confidence instant route', color: 'emerald' },
  { name: 'Express Gateway',   icon: '⚡',  desc: 'Domestic card & net banking — AI selected',          color: 'indigo' },
  { name: 'Global Gateway',    icon: '🌐',  desc: 'International cards & cross-border wallets',          color: 'violet' },
  { name: 'Advanced Pay Rail', icon: '🏦',  desc: 'Your own infrastructure & stored-value rail',         color: 'blue' },
];

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
  indigo:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
  violet:  'bg-violet-500/10 border-violet-500/20 text-violet-500',
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-500',
};

export default function DashboardPaymentsHubPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">

      {/* ── Back nav ── */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {/* ── Page header ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/15 text-primary">Advanced Pay</Badge>
          <Badge variant="outline">India-first</Badge>
          <Badge variant="outline">Global-ready</Badge>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <Activity className="w-3 h-3 mr-1" /> AI-Routed
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Payments Hub</h1>
        <p className="max-w-3xl text-muted-foreground">
          Every method here is <strong className="text-foreground">yours</strong> — Advanced Pay checkout, routing,
          and rails. Your AI engine automatically routes each transaction to the best available gateway per payment method.
          No single-provider lock-in, no third-party branding.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
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
        </div>
      </div>

      {/* ── Gateway overview pills ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {providerCards.map(p => (
          <div key={p.name} className={`flex items-start gap-3 p-4 rounded-xl border ${COLOR_MAP[p.color]}`}>
            <span className="text-2xl">{p.icon}</span>
            <div>
              <p className="text-sm font-bold">{p.name}</p>
              <p className="text-xs opacity-70 mt-0.5 leading-snug">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Unified Virtual Terminal ── */}
      <Card className="border-primary/20 bg-primary/[0.02] shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Virtual Terminal
            <Badge className="ml-2 bg-primary/15 text-primary text-xs flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Advanced Pay — AI Routed
            </Badge>
          </CardTitle>
          <CardDescription>
            Charge any amount via UPI · Card · Net Banking · Wallet — your AI engine picks the best gateway automatically.
            No third-party checkout popup, no lock-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedVirtualTerminal />
        </CardContent>
      </Card>

      {/* ── Rails grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Domestic */}
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Domestic — India Stack
            </CardTitle>
            <CardDescription>
              Optimized for Indian success rates and compliance (GST, DPDP). AI routes to NPCI or best domestic acquirer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {indiaRails.map(({ name, detail, icon: Icon, href, cta, badge }) => (
              <div
                key={name}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{name}</p>
                      {badge && <Badge className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20">{badge}</Badge>}
                    </div>
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

        {/* International */}
        <Card className="border-blue-500/20 bg-blue-500/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe2 className="h-5 w-5 text-blue-600" />
              International
            </CardTitle>
            <CardDescription>
              Enable these rails when ready — all under your Advanced Pay brand. Global Gateway used for INTL fallback.
            </CardDescription>
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
            <Button asChild className="w-full" variant="outline">
              <Link href="/checkout/advanced">Open global-ready checkout →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Developer paths ── */}
      <Card>
        <CardHeader>
          <CardTitle>API & Developer Paths</CardTitle>
          <CardDescription>Wire these endpoints into your site, app, or server-side code.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 font-mono text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Create Payment',     path: 'POST /api/v1/payments' },
              { label: 'Capture Payment',    path: 'POST /api/v1/payments/:id/capture' },
              { label: 'Refund',             path: 'POST /api/v1/payments/:id/refund' },
              { label: 'AI Routing Query',   path: 'GET  /api/v1/routing/decision' },
              { label: 'Fraud Score',        path: 'GET  /api/v1/fraud/score/:id' },
              { label: 'Hosted Checkout',    path: '/checkout' },
              { label: 'Advanced Checkout',  path: '/checkout/advanced' },
              { label: 'Embed Checkout',     path: '/checkout/embed' },
              { label: 'Payment Links',      path: 'POST /api/v1/payment-links' },
            ].map(({ label, path }) => (
              <div key={label} className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                <span className="text-[11px] text-muted-foreground block uppercase tracking-wider">{label}</span>
                <span className="text-foreground text-xs">{path}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
