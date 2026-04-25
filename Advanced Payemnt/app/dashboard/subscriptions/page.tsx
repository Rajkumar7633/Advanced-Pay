'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Repeat,
  Clock,
  Activity,
  Settings,
  TrendingUp,
  Users,
  IndianRupee,
  Loader2,
  RefreshCw,
  Ban,
  Plus,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatting';
import {
  subscriptionsApi,
  type SubscriptionDTO,
  type SubscriptionPlanDTO,
} from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function num(v: number | string | undefined): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function monthlyFromPlan(amount: number, intervalType: string, intervalCount: number): number {
  const c = Math.max(1, intervalCount || 1);
  switch (intervalType) {
    case 'daily':
      return (amount * 365) / 12 / c;
    case 'weekly':
      return (amount * 52) / 12 / c;
    case 'monthly':
      return amount / c;
    case 'yearly':
      return amount / (12 * c);
    default:
      return amount / c;
  }
}

function isWithinLastDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

function shortSubId(id: string) {
  const clean = id.replace(/-/g, '');
  return `sub_${clean.slice(0, 12)}`;
}

function cycleSuffix(intervalType: string, intervalCount: number): string {
  const c = Math.max(1, intervalCount || 1);
  if (intervalType === 'monthly' && c === 1) return 'mo';
  if (intervalType === 'yearly' && c === 1) return 'yr';
  if (intervalType === 'weekly') return `${c} wk`;
  if (intervalType === 'daily') return `${c} day`;
  return `${c}× ${intervalType}`;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'past_due':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300';
    case 'canceled':
      return 'border-border bg-muted text-muted-foreground';
    case 'incomplete':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300';
    default:
      return 'border-border bg-muted/60 text-foreground';
  }
}

export default function SubscriptionsDashboardPage() {
  const [subs, setSubs] = useState<SubscriptionDTO[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [planId, setPlanId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);

  // Create Plan state
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planIntervalType, setPlanIntervalType] = useState('monthly');
  const [planIntervalCount, setPlanIntervalCount] = useState('1');
  const [creatingPlan, setCreatingPlan] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([subscriptionsApi.list(), subscriptionsApi.listPlans()]);
      const sData = sRes as unknown as { data?: SubscriptionDTO[] };
      const pData = pRes as unknown as { data?: SubscriptionPlanDTO[] };
      setSubs(sData?.data ?? []);
      const planList = pData?.data ?? [];
      setPlans(planList);
      setPlanId((prev) => prev || planList[0]?.id || '');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : e instanceof Error
            ? e.message
            : 'Failed to load subscriptions';
      setError(msg || 'Failed to load subscriptions');
      setSubs([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const planById = useMemo(() => {
    const m = new Map<string, SubscriptionPlanDTO>();
    plans.forEach((p) => m.set(p.id, p));
    return m;
  }, [plans]);

  const rows = useMemo(() => {
    return subs.map((s) => {
      const plan = planById.get(s.plan_id);
      return { sub: s, plan };
    });
  }, [subs, planById]);

  const mrr = useMemo(() => {
    let sum = 0;
    for (const s of subs) {
      if (s.status !== 'active') continue;
      const p = planById.get(s.plan_id);
      if (!p) continue;
      sum += monthlyFromPlan(num(p.amount), p.interval_type, p.interval_count);
    }
    return sum;
  }, [subs, planById]);

  const activeCount = useMemo(() => subs.filter((s) => s.status === 'active').length, [subs]);

  const newThisWeek = useMemo(
    () => subs.filter((s) => s.status === 'active' && isWithinLastDays(s.created_at, 7)).length,
    [subs],
  );

  const churnPct = useMemo(() => {
    if (subs.length === 0) return 0;
    const canceled = subs.filter((s) => s.status === 'canceled').length;
    return (canceled / subs.length) * 100;
  }, [subs]);

  const pastDueCount = useMemo(() => subs.filter((s) => s.status === 'past_due').length, [subs]);

  const handleCreate = async () => {
    if (!planId || !email.trim()) {
      toast.error('Choose a plan and enter customer email');
      return;
    }
    setCreating(true);
    try {
      const res = (await subscriptionsApi.create({
        plan_id: planId,
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
      })) as unknown as { message?: string; auth_url?: string };
      toast.success(res?.message ?? 'Subscription created');
      if (res?.auth_url) {
        toast.message('Mandate authorization', { description: res.auth_url });
      }
      setCreateOpen(false);
      setEmail('');
      setPhone('');
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Create failed')
          : 'Create failed';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!planName.trim() || !planAmount) {
      toast.error('Plan name and amount are required');
      return;
    }
    setCreatingPlan(true);
    try {
      await subscriptionsApi.createPlan({
        name: planName.trim(),
        amount: Number(planAmount),
        currency: 'INR',
        interval_type: planIntervalType,
        interval_count: Number(planIntervalCount) || 1,
      });
      toast.success('Billing plan created successfully');
      setCreatePlanOpen(false);
      setPlanName('');
      setPlanAmount('');
      setPlanIntervalType('monthly');
      setPlanIntervalCount('1');
      await load(); // Reload to fetch the newly created plan
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
          ? String((e as any).response?.data?.error ?? 'Create failed')
          : 'Create plan failed';
      toast.error(msg);
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this subscription? This cannot be undone.')) return;
    try {
      await subscriptionsApi.cancel(id);
      toast.success('Subscription canceled');
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Cancel failed')
          : 'Cancel failed';
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Recurring billing</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Advanced Pay subscriptions and mandates — data from your live account.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/dashboard/settings">
              <Settings className="h-4 w-4" />
              Billing settings
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => setCreatePlanOpen(true)}>
            <Plus className="h-4 w-4" />
            Create plan
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={plans.length === 0}>
            <Repeat className="h-4 w-4" />
            Create subscription
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Est. MRR (normalized)</p>
                {loading && !subs.length ? (
                  <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    {formatCurrency(mrr)}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Sum of active plans converted to a monthly equivalent (daily / weekly / monthly / yearly).
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active subscribers</p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {loading && !subs.length ? '—' : formatNumber(activeCount)}
                </p>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {newThisWeek > 0
                  ? `+${formatNumber(newThisWeek)} new in the last 7 days`
                  : 'No new active subscriptions in the last 7 days'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Canceled share</p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {loading && !subs.length ? '—' : `${churnPct.toFixed(1)}%`}
                </p>
              </div>
              <div className="rounded-xl bg-red-500/10 p-3 text-red-600 dark:text-red-400">
                <Activity className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Canceled subscriptions ÷ all subscriptions in view. Past due:{' '}
              <span className="font-medium text-foreground">{pastDueCount}</span>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PLAN ROSTER TABLE - FOR VISIBILITY OF CREATED PLANS */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-lg">Billing Plans configuration</CardTitle>
          <CardDescription>Your engine logic for recurring charges.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3">Plan Name / ID</th>
                  <th className="px-6 py-3">Logic Cycle</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Debit Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{p.name || 'Custom Plan'}</div>
                      <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-normal capitalize bg-primary/5 text-primary border-primary/20">
                        {cycleSuffix(p.interval_type, p.interval_count)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-medium">
                        Active API Ready
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-foreground">
                      {formatCurrency(num(p.amount), p.currency || 'INR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && plans.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No logic plans formulated yet. Use <strong className="text-foreground">Create plan</strong>.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Subscriptions</CardTitle>
              <CardDescription>Customer mandates linked to your billing plans.</CardDescription>
            </div>
            {plans.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Create a plan under{' '}
                <Link href="/dashboard/settings" className="font-medium underline underline-offset-2">
                  Settings
                </Link>{' '}
                (API) to enable new subscriptions.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Plan / amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Next billing</th>
                  <th className="w-24 px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ sub, plan }) => (
                  <tr key={sub.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-foreground">{shortSubId(sub.id)}</td>
                    <td className="max-w-[200px] truncate px-6 py-4 text-foreground">{sub.customer_email}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{plan?.name ?? 'Unknown plan'}</div>
                      <div className="text-xs text-muted-foreground">
                        {plan
                          ? `${formatCurrency(num(plan.amount), plan.currency || 'INR')} / ${cycleSuffix(plan.interval_type, plan.interval_count)}`
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn('font-normal capitalize', statusBadgeClass(sub.status))}>
                        {sub.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {sub.next_billing_date ? (
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          {formatDate(sub.next_billing_date)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {sub.status !== 'canceled' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleCancel(sub.id)}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              No subscriptions yet. Create a plan, then use <strong className="text-foreground">Create subscription</strong>.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New subscription</DialogTitle>
            <DialogDescription>Attach a customer to one of your recurring plans.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(num(p.amount), p.currency || 'INR')} / {cycleSuffix(p.interval_type, p.interval_count)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-email">Customer email</Label>
              <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-phone">Customer phone (optional)</Label>
              <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={creating || !planId}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE PLAN MODAL */}
      <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Billing Plan</DialogTitle>
            <DialogDescription>Define a recurring logic schema for your customers.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Pro Monthly" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-amount">Amount (INR)</Label>
              <Input id="plan-amount" type="number" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} placeholder="e.g. 4999" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-interval">Interval</Label>
                <select
                  id="plan-interval"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={planIntervalType}
                  onChange={(e) => setPlanIntervalType(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-count">Interval Count</Label>
                <Input id="plan-count" type="number" min="1" value={planIntervalCount} onChange={(e) => setPlanIntervalCount(e.target.value)} placeholder="1" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button type="button" variant="outline" onClick={() => setCreatePlanOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleCreatePlan()} disabled={creatingPlan || !planName || !planAmount}>
              {creatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deploy Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
