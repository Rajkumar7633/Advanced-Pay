'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone, CreditCard, Building2, Wallet, Globe2,
  CheckCircle2, Zap, RefreshCw, ShieldCheck, Activity,
  ArrowRight, Loader2, ChevronRight, BarChart2, AlertTriangle, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store/auth';
import apiClient from '@/lib/api-client';
import { CURRENCIES } from '@/lib/currencies';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RoutingDecision {
  provider: string;
  confidence: number;
  factors: string[];
  meta: Record<string, any>;
}

interface PaymentResult {
  transaction_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider?: string;  // from full transaction response
  payment_url?: string;
  fraud_score?: number;        // from full transaction response
  routing_decision?: RoutingDecision;
}

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';
type TerminalState = 'idle' | 'routing' | 'processing' | 'success' | 'failed';

// ─── Provider Branding ────────────────────────────────────────────────────────

const PROVIDER_META: Record<string, { label: string; color: string; desc: string; icon: string }> = {
  npci:         { label: 'UPI Rail',             color: 'emerald', desc: 'Instant UPI collect · QR · intent',        icon: '🇮🇳' },
  razorpay:     { label: 'Express Gateway',       color: 'indigo',  desc: 'High-success domestic card processing',   icon: '⚡' },
  stripe:       { label: 'Global Gateway',        color: 'violet',  desc: 'International card & wallet processing',  icon: '🌐' },
  advanced_pay: { label: 'Advanced Pay Rail',     color: 'blue',    desc: 'Your own payment infrastructure',         icon: '🏦' },
};

const PROVIDER_COLORS: Record<string, string> = {
  npci:         'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  razorpay:     'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  stripe:       'bg-violet-500/10 border-violet-500/30 text-violet-400',
  advanced_pay: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof Smartphone; desc: string; badge?: string }[] = [
  { id: 'upi',        label: 'UPI',          icon: Smartphone,  desc: 'Instant UPI collect / intent / QR', badge: 'Recommended' },
  { id: 'card',       label: 'Card',         icon: CreditCard,  desc: 'Debit / Credit / Prepaid cards' },
  { id: 'netbanking', label: 'Net Banking',  icon: Building2,   desc: 'All major Indian banks supported' },
  { id: 'wallet',     label: 'Wallet',       icon: Wallet,      desc: 'Paytm, PhonePe, Amazon Pay, Jio' },
];

// FX to INR (test-mode approximation, production uses live forex)
const FX_TO_INR: Record<string, number> = {
  INR: 1, USD: 83.5, EUR: 90.2, GBP: 105.3, AED: 22.7,
  SGD: 61.8, JPY: 0.55, CAD: 61.3, AUD: 54.1, CHF: 93.4,
  SAR: 22.3, MYR: 17.8, BDT: 0.76, THB: 2.35, ZAR: 4.48,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function UnifiedVirtualTerminal() {
  // Form state
  const [amount, setAmount]   = useState('');
  const [currency, setCurrency] = useState('INR');
  const [method, setMethod]   = useState<PaymentMethod>('upi');
  const [desc, setDesc]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');

  // UPI-specific
  const [upiId, setUpiId] = useState('');

  // Card-specific
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv]       = useState('');
  const [cardName, setCardName]     = useState('');

  // Net banking
  const [bank, setBank] = useState('');

  // Terminal state
  const [termState, setTermState] = useState<TerminalState>('idle');
  const [routing, setRouting]     = useState<RoutingDecision | null>(null);
  const [result, setResult]       = useState<PaymentResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const { token } = useAuthStore?.() || {};

  // card brand detection
  const getCardBrand = (n: string) => {
    if (n.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(n)) return 'MASTERCARD';
    if (/^3[47]/.test(n)) return 'AMEX';
    if (n.startsWith('6')) return 'RUPAY';
    return '';
  };
  const cardBrand = getCardBrand(cardNumber);
  const [cvvFocused, setCvvFocused] = useState(false);

  // Format card number with spaces
  const formatCardDisplay = (n: string) => n.replace(/(.{4})/g, '$1 ').trim() || '•••• •••• •••• ••••';
  const formatExpDisplay  = (e: string) => e || 'MM/YY';

  // Derived
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];
  const amountNum = Number(amount) || 0;
  const amountInr = currency === 'INR' ? amountNum : Math.round(amountNum * (FX_TO_INR[currency] ?? 1));

  // ── Live Routing Preview ─────────────────────────────────────────────────
  const fetchRouting = useCallback(async () => {
    if (amountNum <= 0) { setRouting(null); return; }
    try {
      const res = await apiClient.get('/routing/decision', {
        params: { amount: amountInr, method },
      }) as any;
      setRouting(res?.data?.data || res?.data || null);
    } catch {
      // Silently ignore routing preview errors
      setRouting(null);
    }
  }, [amountInr, method]);

  useEffect(() => {
    const t = setTimeout(fetchRouting, 400); // debounce
    return () => clearTimeout(t);
  }, [fetchRouting]);

  // ── Submit Payment ───────────────────────────────────────────────────────
  const handlePay = async () => {
    setError(null);

    if (!amountNum || amountNum <= 0) { setError('Enter a valid amount.'); return; }
    if (!email.trim())                { setError('Customer email is required.'); return; }
    if (method === 'upi' && !upiId.trim()) { setError('Enter a valid UPI ID (e.g. name@upi)'); return; }

    setTermState('routing');

    // Step 1 — fetch live routing decision
    let liveRouting: RoutingDecision | null = routing;
    try {
      const res = await apiClient.get('/routing/decision', {
        params: { amount: amountInr, method },
      }) as any;
      liveRouting = res?.data?.data || res?.data || null;
      setRouting(liveRouting);
    } catch { /* use cached */ }

    setTermState('processing');

    // Step 2 — submit through Advanced Pay's OWN payment system
    try {
      const orderId = `adv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const metadata: Record<string, any> = {
        description: desc || `${selectedCurrency.flag} ${amount} ${currency} via Advanced Pay`,
        method_detail: {},
        display_currency: currency,
        display_amount: amount,
        terminal: 'virtual',
        platform: 'advanced_pay',
      };

      if (method === 'upi')        metadata.method_detail = { upi_id: upiId };
      if (method === 'card')       metadata.method_detail = { last4: cardNumber.slice(-4), name: cardName };
      if (method === 'netbanking') metadata.method_detail = { bank };
      if (method === 'wallet')     metadata.method_detail = { wallet_type: 'paytm' };

      const payload = {
        order_id:        orderId,
        amount:          amountInr,    // Always INR to backend (FX already converted)
        currency:        'INR',
        payment_method:  method,
        customer_email:  email.trim(),
        customer_phone:  phone.trim() || '+919000000000',
        metadata,
      };

      const res = await apiClient.post('/payments', payload) as any;
      const data = res?.data?.data || res?.data || res;
      const txId = data?.transaction_id || data?.id;

      // Fetch the full transaction to get routing_decision + fraud_score
      let fullTx = data;
      if (txId) {
        try {
          const txRes = await apiClient.get(`/transactions/${txId}`) as any;
          fullTx = txRes?.data?.data || txRes?.data || data;
        } catch {
          // fallback to create-response, routing will come from live preview
          fullTx = { ...data, routing_decision: liveRouting };
        }
      }

      setResult({
        ...fullTx,
        routing_decision: fullTx?.routing_decision || liveRouting || undefined,
      });
      setTermState('success');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Payment could not be processed.';

      // Handle fraud-blocked
      if (msg.includes('declined') || msg.includes('fraud') || msg.includes('risk')) {
        setError('⚠️ Transaction blocked by Advanced Pay AI Fraud Engine. Try a different method or contact support.');
      } else {
        setError(msg);
      }
      setTermState('failed');
    }
  };

  const reset = () => {
    setTermState('idle'); setResult(null); setError(null);
    setAmount(''); setDesc(''); setUpiId('');
    setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardName('');
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (termState === 'success' && result) {
    const pm = PROVIDER_META[result.routing_decision?.provider || result.payment_provider || 'advanced_pay'] || PROVIDER_META['advanced_pay'];
    const colorCls = PROVIDER_COLORS[result.routing_decision?.provider || result.payment_provider || 'advanced_pay'];
    const fraudScore = result.fraud_score ?? result.routing_decision?.meta?.fraud_score;
    const finalProvider = result.payment_provider || result.routing_decision?.provider || (result.routing_decision as any)?.final_provider;

    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Success header */}
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Payment Processed!</h3>
            <p className="text-sm text-muted-foreground">
              Routed through your Advanced Pay network
            </p>
          </div>
        </div>

        {/* Transaction details */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {[
                      { label: 'Transaction ID', value: result.transaction_id, mono: true },
            { label: 'Order ID',       value: result.order_id,       mono: true },
            { label: 'Amount',         value: `₹${amountInr.toLocaleString('en-IN')} INR${currency !== 'INR' ? ` (${selectedCurrency.symbol}${amount} ${currency})` : ''}` },
            { label: 'Method',         value: PAYMENT_METHODS.find(m => m.id === method)?.label || method },
            { label: 'Gateway Used',   value: finalProvider ? (PROVIDER_META[finalProvider]?.label || finalProvider) : 'Advanced Pay', bold: true },
            { label: 'Status',         value: result.status, badge: true },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              {row.badge ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 capitalize">{row.value}</Badge>
              ) : (
                <span className={`font-medium ${row.mono ? 'font-mono text-xs' : ''}`}>{row.value}</span>
              )}
            </div>
          ))}
        </div>

        {/* AI Routing details */}
        {result.routing_decision && (
          <div className={`rounded-xl border p-4 space-y-2 ${colorCls}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="w-4 h-4" />
              Advanced Pay AI Routing
            </div>
            <div className="text-sm">
              <span className="opacity-70">Routed via </span>
              <strong>{pm.icon} {pm.label}</strong>
              <span className="opacity-70"> — {pm.desc}</span>
            </div>
            <div className="flex items-center gap-3 text-xs opacity-80">
              <span>Confidence: <strong>{(result.routing_decision.confidence * 100).toFixed(0)}%</strong></span>
              {fraudScore !== undefined && <span>Fraud Score: <strong>{fraudScore}/100</strong></span>}
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {result.routing_decision.factors.map(f => (
                <span key={f} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono">{f}</span>
              ))}
            </div>
          </div>
        )}

        <Button onClick={reset} className="w-full" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> New Payment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live routing preview bar */}
      {routing && amountNum > 0 && termState === 'idle' && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm animate-in fade-in duration-300 ${PROVIDER_COLORS[routing.provider] ?? 'bg-muted border-border text-foreground'}`}>
          <Activity className="w-4 h-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">AI Routing Preview: </span>
            <span>
              {(PROVIDER_META[routing.provider] || PROVIDER_META['advanced_pay']).icon}{' '}
              {(PROVIDER_META[routing.provider] || PROVIDER_META['advanced_pay']).label}
            </span>
            <span className="text-xs opacity-70 ml-2">({(routing.confidence * 100).toFixed(0)}% confidence)</span>
          </div>
          <div className="flex flex-wrap gap-1 shrink-0">
            {routing.factors.slice(0, 2).map(f => (
              <span key={f} className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono hidden md:inline">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* ── Left: Form ── */}
        <div className="space-y-5">

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Amount</Label>
              <Input
                type="number"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(null); setTermState('idle'); }}
                className="text-xl font-bold h-12"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full h-12 rounded-md border border-input bg-background px-3 text-sm font-medium"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* INR conversion note */}
          {currency !== 'INR' && amountNum > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Globe2 className="w-3.5 h-3.5 shrink-0" />
              ≈ <strong>₹{amountInr.toLocaleString('en-IN')}</strong> INR will be settled (FX converted by Advanced Pay)
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setError(null); }}
                    className={`relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200 ${
                      active
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/50 hover:border-primary/30'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{m.label}</span>
                    {m.badge && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                        {m.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic method form */}
          <div className="space-y-3">
            {method === 'upi' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">UPI ID</Label>
                <Input
                  placeholder="yourname@upi or yourname@paytm"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}

            {method === 'card' && (
              <div className="space-y-4">
                {/* Premium card preview */}
                <div className={`relative h-44 rounded-2xl p-6 overflow-hidden select-none transition-all duration-500 ${cvvFocused ? '[transform:rotateY(180deg)]' : ''}`}
                  style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
                >
                  {/* Card front */}
                  <div className={`absolute inset-0 rounded-2xl p-6 flex flex-col justify-between backface-hidden transition-transform duration-500
                    bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 shadow-2xl shadow-indigo-500/30
                    ${cvvFocused ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'}`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {/* Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 rounded-2xl" />
                    {/* Chip + Brand */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="w-10 h-8 rounded-md bg-yellow-300/90 shadow-inner flex items-center justify-center">
                        <div className="w-6 h-5 rounded-sm border border-yellow-500/50 grid grid-cols-2 gap-px p-0.5">
                          <div className="bg-yellow-500/60 rounded-[1px]" /><div className="bg-yellow-500/60 rounded-[1px]" />
                          <div className="bg-yellow-500/60 rounded-[1px]" /><div className="bg-yellow-500/60 rounded-[1px]" />
                        </div>
                      </div>
                      <div className="text-right">
                        {cardBrand ? (
                          <span className="text-white font-black text-lg tracking-widest drop-shadow">{cardBrand}</span>
                        ) : (
                          <CreditCard className="w-8 h-8 text-white/60" />
                        )}
                      </div>
                    </div>
                    {/* Card number */}
                    <div className="relative z-10">
                      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Card Number</p>
                      <p className="text-white font-mono text-lg tracking-[0.2em] font-bold drop-shadow">
                        {cardNumber
                          ? cardNumber.replace(/(.{4})/g, '$1 ').trim().padEnd(19, ' ').replace(/ /g, '\u00a0')
                          : '\u2022\u2022\u2022\u2022\u00a0\u2022\u2022\u2022\u2022\u00a0\u2022\u2022\u2022\u2022\u00a0\u2022\u2022\u2022\u2022'}
                      </p>
                    </div>
                    {/* Name + Expiry */}
                    <div className="flex justify-between items-end relative z-10">
                      <div>
                        <p className="text-white/50 text-[10px] uppercase tracking-widest">Card Holder</p>
                        <p className="text-white font-semibold text-sm tracking-wider uppercase truncate max-w-[160px]">
                          {cardName || 'FULL NAME'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/50 text-[10px] uppercase tracking-widest">Expires</p>
                        <p className="text-white font-semibold text-sm font-mono">{cardExpiry || 'MM/YY'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Card back */}
                  <div className="absolute inset-0 rounded-2xl flex flex-col justify-center
                    bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="w-full h-10 bg-black/80 mt-8" />
                    <div className="px-6 mt-4">
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">CVV</p>
                      <div className="bg-white rounded px-4 py-2 text-right">
                        <span className="font-mono text-slate-800 text-lg tracking-[0.3em]">
                          {cardCvv ? '•'.repeat(cardCvv.length) : '•••'}
                        </span>
                      </div>
                    </div>
                    <p className="text-center text-slate-500 text-[10px] mt-4">3-digit security code on back of card</p>
                  </div>
                </div>

                {/* Card inputs */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cardholder Name</Label>
                    <Input
                      placeholder="Name as on card"
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="h-11 font-medium text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Card Number</Label>
                    <div className="relative">
                      <Input
                        placeholder="1234  5678  9012  3456"
                        value={cardNumber.replace(/(.{4})/g, '$1 ').trim()}
                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        className="h-11 font-mono tracking-widest pr-20 text-sm"
                      />
                      {cardBrand && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-primary tracking-widest">
                          {cardBrand}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Expiry Date</Label>
                      <Input
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setCardExpiry(v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v);
                        }}
                        className="h-11 font-mono text-center text-base"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">CVV / CVC</Label>
                      <div className="relative">
                        <Input
                          placeholder="•••"
                          value={cardCvv}
                          type="password"
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          onFocus={() => setCvvFocused(true)}
                          onBlur={() => setCvvFocused(false)}
                          className="h-11 font-mono text-center text-lg"
                          maxLength={4}
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {method === 'netbanking' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Select Bank</Label>
                <select
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Choose your bank —</option>
                  {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra', 'Yes Bank', 'Canara Bank', 'Bank of Baroda', 'PNB', 'Union Bank', 'IndusInd Bank', 'IDFC First', 'Federal Bank'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {method === 'wallet' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Wallet</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['Paytm', 'PhonePe', 'Amazon Pay', 'Jio Money', 'Mobikwik', 'Freecharge'].map(w => (
                    <button
                      key={w}
                      className="text-sm px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-center font-medium"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Customer Email *</Label>
              <Input type="email" placeholder="customer@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Phone (optional)</Label>
              <Input type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description (optional)</Label>
            <Input placeholder="Product name, invoice #, or note" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handlePay}
            disabled={termState === 'processing' || termState === 'routing' || !amountNum}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            {termState === 'routing' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> AI Routing…</>
            ) : termState === 'processing' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing via Advanced Pay…</>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Charge {selectedCurrency.symbol}{amount || '0'} {currency}
                {currency !== 'INR' && amountNum > 0 && <span className="text-white/60 text-xs">(≈₹{amountInr})</span>}
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Processed securely by <strong className="text-foreground">Advanced Pay</strong> — AI-routed to best available gateway
          </p>
        </div>

        {/* ── Right: Live info panel ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Routing Engine
            </p>
            {Object.entries(PROVIDER_META).map(([key, pm]) => {
              const isActive = routing?.provider === key;
              return (
                <div key={key} className={`flex items-center gap-2 p-2 rounded-lg transition-all ${isActive ? `${PROVIDER_COLORS[key]} border` : 'opacity-30'}`}>
                  <span className="text-base">{pm.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{pm.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{pm.desc}</p>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground">
              AI picks the best rail per transaction automatically.
            </p>
          </div>

          {/* Currency grid */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Supported Currencies
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`text-left px-2 py-1.5 rounded-lg border text-xs transition-all ${
                    currency === c.code ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c.flag} {c.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
