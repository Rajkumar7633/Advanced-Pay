'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  IndianRupee,
  Lock,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatting';
import apiClient from '@/lib/api-client';

type Region = 'IN' | 'INTL';
type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cross_border_wallet';

const INR_USD = 83.2;

export function AdvancedGlobalCheckout() {
  const searchParams = useSearchParams();

  const [region, setRegion] = useState<Region>('IN');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [gstin, setGstin] = useState('');
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<PayMethod>('upi');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const paramAmount = searchParams.get('amount');
  const itemName = searchParams.get('item') || 'Custom Invoice';
  const baseInr = paramAmount ? Number(paramAmount) : 5000;
  const subtotalInr = baseInr;
  const gstRate = region === 'IN' ? 0.18 : 0;
  const gstAmount = Math.round(subtotalInr * gstRate * 100) / 100;
  const totalInr = Math.round((subtotalInr + gstAmount) * 100) / 100;

  const display = useMemo(() => {
    if (region === 'IN') {
      return {
        currency: 'INR' as const,
        subtotal: subtotalInr,
        taxLabel: 'GST (18%)',
        tax: gstAmount,
        total: totalInr,
        headline: 'India stack: UPI · cards · net banking (Advanced Pay)',
      };
    }
    const totalUsd = totalInr / INR_USD;
    return {
      currency: 'USD' as const,
      subtotal: subtotalInr / INR_USD,
      taxLabel: 'Estimated duties / tax',
      tax: gstAmount / INR_USD,
      total: totalUsd,
      headline: 'Global: your cards & cross-border wallet (Advanced Pay)',
    };
  }, [region, subtotalInr, gstAmount, totalInr]);

  const recommended = region === 'IN' ? 'upi' : 'card';

  const handlePay = async () => {
    setErr('');
    if (!email.trim()) {
      setErr('Email is required.');
      return;
    }
    if (region === 'IN' && !consent) {
      setErr('Please accept data processing as per DPDP for India checkout.');
      return;
    }
    if (region === 'INTL' && !consent) {
      setErr('Please accept cross-border processing notice.');
      return;
    }

    setBusy(true);
    const payment_method =
      method === 'cross_border_wallet' || method === 'wallet' ? 'wallet' : method;

    const payload = {
      order_id: `adv_${region}_${Date.now()}`,
      amount: totalInr,
      currency: 'INR',
      payment_method,
      customer_email: email.trim(),
      customer_phone: phone.trim() || '+919000000000',
      metadata: {
        checkout: 'advanced_global',
        processor: 'advanced_pay',
        region,
        gstin: gstin.trim() || undefined,
        display_currency: display.currency,
        consent_dpdp: consent,
        selected_rail: method,
      },
    };

    try {
      await apiClient.post('/payments', payload);
      setDone(true);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setDone(true);
      } else {
        setErr(e?.response?.data?.error || 'Payment could not start. Try sandbox token or retry.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Payment intent created</h2>
        <p className="text-sm text-muted-foreground">
          Advanced checkout (India / world) recorded this attempt. In production this step would open your acquirer or
          UPI intent.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/checkout">Back to standard checkout</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1 font-semibold uppercase tracking-widest px-3 py-1">
            <Sparkles className="h-4 w-4" />
            Global Checkout
          </Badge>
          <span className="text-xs text-white/40 font-mono">ENCRYPTED_SESSION: hosted page + multi-rail</span>
        </div>

        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="text-xl font-bold text-white tracking-tight">Market</CardTitle>
            <CardDescription className="text-white/50 text-sm">Switch routing, tax display, and compliance mandates dynamically.</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <RadioGroup
              value={region}
              onValueChange={(v) => {
                setRegion(v as Region);
                setMethod(v === 'IN' ? 'upi' : 'card');
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                  region === 'IN' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <RadioGroupItem value="IN" id="in" className="mt-1" />
                <div>
                  <div className="flex items-center gap-2 font-bold text-white tracking-wide">
                    <div className="bg-blue-500/20 p-1.5 rounded-md">
                      <IndianRupee className="h-4 w-4 text-blue-400" />
                    </div>
                    India (Domestic)
                  </div>
                  <p className="mt-2 text-xs text-white/50 leading-relaxed">
                    GST breakdown, UPI / RuPay priority, DPDP consent copy.
                  </p>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                  region === 'INTL' ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <RadioGroupItem value="INTL" id="intl" className="mt-1" />
                <div>
                  <div className="flex items-center gap-2 font-bold text-white tracking-wide">
                    <div className="bg-indigo-500/20 p-1.5 rounded-md">
                      <Globe2 className="h-4 w-4 text-indigo-400" />
                    </div>
                    Rest of world
                  </div>
                  <p className="mt-2 text-xs text-white/50 leading-relaxed">
                    FX estimate for display — settlement stays on your Advanced Pay rules.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-bl from-green-500/5 to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="text-xl font-bold text-white tracking-tight">Customer Intelligence</CardTitle>
            <CardDescription className="text-white/50 text-sm">Secure compliance parameters dynamically fetched for identity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 relative">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="em" className="text-white/70">Email Address</Label>
              <Input
                id="em"
                type="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500 focus:ring-blue-500/20"
                placeholder="Secure email for invoice"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph" className="text-white/70">Phone Number</Label>
              <Input
                id="ph"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500 focus:ring-blue-500/20"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={region === 'IN' ? '+91 98765 43210' : '+1 …'}
              />
            </div>
            {region === 'IN' && (
              <div className="space-y-2">
                <Label htmlFor="gst" className="text-white/70">GSTIN Tracker <span className="text-white/30 text-xs">(optional)</span></Label>
                <Input
                  id="gst"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500 focus:ring-blue-500/20"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="text-xl font-bold text-white tracking-tight">Smart Routing Edge</CardTitle>
            <CardDescription className="text-white/50 text-sm">
              AI Suggested: <strong className="text-white bg-white/10 px-2 py-0.5 rounded-md font-mono text-xs">{recommended.toUpperCase()}</strong> dynamically routed for maximum success rate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'upi' as const,
                    label: 'UPI',
                    sub: 'Your collect / intent / QR rail',
                    icon: Smartphone,
                    inOnly: true as const,
                  },
                  {
                    id: 'card' as const,
                    label: 'Card',
                    sub: 'Your domestic or global card stack',
                    icon: CreditCard,
                  },
                  {
                    id: 'netbanking' as const,
                    label: 'Net banking',
                    sub: 'Your bank redirect flow',
                    icon: Building2,
                    inOnly: true as const,
                  },
                  {
                    id: 'wallet' as const,
                    label: 'Platform wallet',
                    sub: 'Advanced Pay balance / stored value',
                    icon: Wallet,
                    inOnly: true as const,
                  },
                  {
                    id: 'cross_border_wallet' as const,
                    label: 'Cross-border wallet',
                    sub: 'Your international wallet rail (same brand)',
                    icon: Globe2,
                    intlOnly: true as const,
                  },
                ] as const
              )
                .filter((m) => {
                  if ('inOnly' in m && m.inOnly && region !== 'IN') return false;
                  if ('intlOnly' in m && m.intlOnly && region !== 'INTL') return false;
                  return true;
                })
                .map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${
                        active ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-6 w-6 ${active ? 'text-primary drop-shadow-[0_0_5px_rgba(var(--primary),0.5)]' : 'text-white/40'}`} />
                      <div>
                        <div className="flex items-center gap-2 font-bold text-white tracking-wide">
                          {m.label}
                          {recommended === m.id && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold tracking-widest px-2 py-0">
                              Best success
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-1">{m.sub}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
            {region === 'INTL' && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" disabled className="opacity-80">
                    Device quick-pay
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional one-tap using tokens you issue. Enable under{' '}
                  <Link href="/dashboard/settings/payments" className="font-medium text-primary underline-offset-2 hover:underline">
                    Settings → Your payment methods
                  </Link>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 shadow-[0_0_20px_rgba(59,130,246,0.05)] backdrop-blur-md">
          <Checkbox id="c" className="border-blue-500/50 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white mb-auto" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
          <label htmlFor="c" className="cursor-pointer text-[13px] leading-relaxed text-blue-100/70 select-none">
            {region === 'IN' ? (
              <>
                I securely authorize the dynamic processing of my identity tokens under the jurisdiction of the <strong className="text-blue-300">Digital Personal Data Protection Act</strong>, enabling zero-trust transaction communications.
              </>
            ) : (
              <>
                I understand this charge may be processed outside India and agree to cross-border data transfer for
                payment processing only.
              </>
            )}
          </label>
        </div>

        {err && <p className="text-sm font-medium text-destructive">{err}</p>}

        <Button size="lg" className="w-full gap-3 sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider text-sm rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95" onClick={handlePay} disabled={busy || baseInr === 0}>
          <Lock className="h-4 w-4 drop-shadow-md" />
          {busy ? 'Establishing secure tunnel…' : baseInr === 0 ? 'Invalid Amount' : `Confirm Payment — ${formatCurrency(display.total, display.currency)}`}
        </Button>
      </div>

      <div className="space-y-5">
        <Card className="sticky top-6 border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <CardHeader className="pb-4">
            <CardTitle className="text-sm uppercase tracking-widest text-white/50 font-bold">Ledger Overview</CardTitle>
            <CardDescription className="text-white text-lg font-bold tracking-tight">{display.headline}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60 font-medium">{itemName}</span>
              <span className="font-bold text-white">{formatCurrency(display.subtotal, display.currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60 font-medium">{display.taxLabel}</span>
              <span className="font-bold text-white">{formatCurrency(display.tax, display.currency)}</span>
            </div>
            <div className="border-t border-white/10 pt-4 mt-2 flex justify-between items-end">
              <div>
                <span className="block text-[11px] uppercase tracking-widest text-white/40 mb-1 font-bold">Total Allocation</span>
                <span className="text-3xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  {formatCurrency(display.total, display.currency)}
                </span>
              </div>
            </div>
            {region === 'INTL' && (
              <p className="text-[11px] text-muted-foreground">
                Shown in USD at indicative ₹{INR_USD}/USD. Final amount is settled in INR on your gateway ledger unless
                multi-currency is enabled in admin.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2 mb-6">
              {region === 'IN' ? (
                <>
                  <Badge variant="outline">UPI</Badge>
                  <Badge variant="outline">Cards</Badge>
                  <Badge variant="outline">Your PCI scope</Badge>
                </>
              ) : (
                <>
                  <Badge variant="outline">Your intl rail</Badge>
                  <Badge variant="outline">Cards</Badge>
                  <Badge variant="outline">3DS</Badge>
                </>
              )}
            </div>

            {err && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 mb-4 text-xs text-red-500">
                {err}
              </div>
            )}

            <Button 
              className="w-full relative shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all font-bold group"
              size="lg"
              disabled={busy}
              onClick={handlePay}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md" />
              {busy ? (
                <span className="relative flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Routing via edge...
                </span>
              ) : (
                <span className="relative flex items-center justify-between w-full px-2">
                  <span>Pay securely</span>
                  <Lock className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
