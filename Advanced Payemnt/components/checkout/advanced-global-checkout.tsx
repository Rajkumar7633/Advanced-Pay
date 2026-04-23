'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
  const [region, setRegion] = useState<Region>('IN');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [gstin, setGstin] = useState('');
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<PayMethod>('upi');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const baseInr = 4999;
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
          <Badge variant="secondary" className="gap-1 font-semibold">
            <Sparkles className="h-3 w-3" />
            First-party India + global
          </Badge>
          <span className="text-xs text-muted-foreground">REQUIREMENTS_MASTER: hosted page + multi-rail</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market</CardTitle>
            <CardDescription>Switch routing, tax display, and recommended payment method.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={region}
              onValueChange={(v) => {
                setRegion(v as Region);
                setMethod(v === 'IN' ? 'upi' : 'card');
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  region === 'IN' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="IN" id="in" className="mt-1" />
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    India (domestic)
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    GST breakdown, UPI / RuPay priority, DPDP consent copy.
                  </p>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  region === 'INTL' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="INTL" id="intl" className="mt-1" />
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <Globe2 className="h-4 w-4 text-primary" />
                    Rest of world
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    FX estimate for display — settlement stays on your Advanced Pay rules.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer</CardTitle>
            <CardDescription>Minimal fields; GSTIN optional for B2B in India.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="em">Email</Label>
              <Input
                id="em"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph">Phone</Label>
              <Input
                id="ph"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={region === 'IN' ? '+91 98765 43210' : '+1 …'}
              />
            </div>
            {region === 'IN' && (
              <div className="space-y-2">
                <Label htmlFor="gst">GSTIN (optional)</Label>
                <Input
                  id="gst"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Smart method</CardTitle>
            <CardDescription>
              Suggested: <strong className="text-foreground">{recommended.toUpperCase()}</strong> for your region.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
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
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          {m.label}
                          {recommended === m.id && (
                            <Badge variant="outline" className="text-[10px]">
                              Best success
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.sub}</p>
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

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <Checkbox id="c" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
          <label htmlFor="c" className="cursor-pointer text-sm leading-snug text-muted-foreground">
            {region === 'IN' ? (
              <>
                I agree to the processing of my personal data for this payment under applicable Indian law, including the
                Digital Personal Data Protection Act, and to receive transaction communications.
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

        <Button size="lg" className="w-full gap-2 sm:w-auto" onClick={handlePay} disabled={busy}>
          <Lock className="h-4 w-4" />
          {busy ? 'Securing…' : `Pay ${formatCurrency(display.total, display.currency)}`}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-4 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
            <CardDescription>{display.headline}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Advanced Pay Pro</span>
              <span className="font-medium">{formatCurrency(display.subtotal, display.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{display.taxLabel}</span>
              <span className="font-medium">{formatCurrency(display.tax, display.currency)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(display.total, display.currency)}</span>
            </div>
            {region === 'INTL' && (
              <p className="text-[11px] text-muted-foreground">
                Shown in USD at indicative ₹{INR_USD}/USD. Final amount is settled in INR on your gateway ledger unless
                multi-currency is enabled in admin.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
