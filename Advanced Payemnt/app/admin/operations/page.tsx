'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Eye, FileCheck2, Globe, IndianRupee, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminNav } from '@/components/admin/admin-nav';
import { MerchantDetailSheet } from '@/components/admin/merchant-detail-sheet';
import {
  useAdminMerchants,
  useAdminMutateMerchantStatus,
  useAdminSettings,
  useAdminMutateSettings,
  useAdminTransactions,
} from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatting';

const COMPLIANCE_ITEMS = [
  {
    id: 'kyc',
    title: 'Merchant KYC & onboarding',
    detail: 'Review pending merchants, document checks, and risk tier assignment (master plan Phase 1).',
    status: 'operational' as const,
  },
  {
    id: 'dpdp',
    title: 'DPDP / consent posture',
    detail: 'Platform-wide consent logging for payouts and webhooks; align with India Digital Personal Data Protection Act.',
    status: 'review' as const,
  },
  {
    id: 'rbi',
    title: 'RBI PA / PAPG readiness',
    detail: 'Settlement cycles, nodal account flows, and dispute SLAs — track before live regulated volume.',
    status: 'planned' as const,
  },
  {
    id: 'pci',
    title: 'PCI DSS scope',
    detail: 'Hosted fields / tokenization reduce SAQ scope; admin monitors no raw PAN storage in logs.',
    status: 'review' as const,
  },
];

export default function AdminOperationsPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [merchantDetailId, setMerchantDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') !== 'true') {
      router.replace('/admin/login');
    }
  }, [router]);

  const { data: merchants, refetch: refetchMerchants } = useAdminMerchants();
  const { data: settings, refetch: refetchSettings } = useAdminSettings();
  const { data: transactions } = useAdminTransactions();
  const merchantMutation = useAdminMutateMerchantStatus();
  const settingsMutation = useAdminMutateSettings();

  const pendingKyc = useMemo(
    () => (merchants || []).filter((m) => m.status === 'pending'),
    [merchants]
  );

  const handleExportTransactions = () => {
    const rows = transactions || [];
    if (!rows.length) {
      toast.message('No transactions to export', { description: 'Run a few test payments first.' });
      return;
    }
    setExporting(true);
    try {
      const header = ['id', 'merchant', 'amount', 'currency', 'status', 'method', 'created_at'];
      const csv = [
        header.join(','),
        ...rows.map((t) =>
          [t.id, `"${(t.merchant || '').replace(/"/g, '""')}"`, t.amount, t.currency, t.status, t.method, t.created_at].join(
            ','
          )
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `advanced-pay-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } finally {
      setExporting(false);
    }
  };

  const toggleSetting = async (key: 'auto_approve_merchants' | 'fraud_blocking' | 'international_payments' | 'maintenance_mode', value: boolean) => {
    try {
      await settingsMutation.mutateAsync({ [key]: value });
      toast.success('Platform setting updated');
      refetchSettings();
    } catch {
      toast.error('Could not update setting (check admin API)');
    }
  };

  const setMerchantStatus = async (id: string, status: string) => {
    try {
      await merchantMutation.mutateAsync({ merchantId: id, status });
      toast.success(`Merchant ${status}`);
      refetchMerchants();
    } catch {
      toast.error('Status update failed');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/25 via-background to-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Operations & compliance</h1>
                <p className="text-[11px] text-muted-foreground">India-first controls + global switches</p>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COMPLIANCE_ITEMS.map((item) => (
            <Card key={item.id} className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={
                      item.status === 'operational'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : item.status === 'review'
                          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                          : 'bg-muted text-muted-foreground'
                    }
                  >
                    {item.status === 'operational' ? 'Live' : item.status === 'review' ? 'Review' : 'Planned'}
                  </Badge>
                </div>
                <CardDescription className="text-xs leading-relaxed">{item.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  KYC queue
                </CardTitle>
                <CardDescription>Pending merchant approvals (REQUIREMENTS_MASTER — admin backlog)</CardDescription>
              </div>
              <Badge variant="outline">{pendingKyc.length} pending</Badge>
            </CardHeader>
            <CardContent>
              {pendingKyc.length === 0 ? (
                <div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
                  <p>No merchants in <strong className="text-foreground">pending</strong> status right now.</p>
                  <p className="mx-auto max-w-md text-xs leading-relaxed">
                    New sign-ups default to <strong className="text-foreground">active</strong>. Use{' '}
                    <strong className="text-foreground">Admin → Merchants</strong> for full lists, deep profiles, and suspend / reactivate.
                    To use this queue for explicit KYC, move a merchant to pending (support workflow or future tooling).
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingKyc.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(m.date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="secondary" className="gap-1" onClick={() => setMerchantDetailId(m.id)}>
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </Button>
                            <Button size="sm" variant="default" onClick={() => setMerchantStatus(m.id, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setMerchantStatus(m.id, 'suspended')}>
                              Hold
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Platform switches
              </CardTitle>
              <CardDescription>Mirror master plan “core features” toggles for ops drills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {settings ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-approve">Auto-approve merchants</Label>
                      <p className="text-xs text-muted-foreground">Sandbox only — disable for production</p>
                    </div>
                    <Switch
                      id="auto-approve"
                      checked={settings.auto_approve_merchants}
                      onCheckedChange={(v) => toggleSetting('auto_approve_merchants', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="fraud">Fraud blocking</Label>
                      <p className="text-xs text-muted-foreground">Rule-based gate before ML PFS</p>
                    </div>
                    <Switch
                      id="fraud"
                      checked={settings.fraud_blocking}
                      onCheckedChange={(v) => toggleSetting('fraud_blocking', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="intl">International payments</Label>
                      <p className="text-xs text-muted-foreground">Cards / FX path (scaffold)</p>
                    </div>
                    <Switch
                      id="intl"
                      checked={settings.international_payments}
                      onCheckedChange={(v) => toggleSetting('international_payments', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="maint">Maintenance mode</Label>
                      <p className="text-xs text-muted-foreground">Reject new checkouts globally</p>
                    </div>
                    <Switch
                      id="maint"
                      checked={settings.maintenance_mode}
                      onCheckedChange={(v) => toggleSetting('maintenance_mode', v)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading settings…</p>
              )}
              <Button variant="secondary" className="w-full gap-2" onClick={handleExportTransactions} disabled={exporting}>
                <Download className="h-4 w-4" />
                Export transactions CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Admin playbook
            </CardTitle>
            <CardDescription>
              Aligns with <code className="rounded bg-muted px-1 text-xs">REQUIREMENTS_MASTER_PLAN.md</code> — merchant
              tooling is ahead; use this view for compliance backlog and exports before go-live.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>

      <MerchantDetailSheet
        merchantId={merchantDetailId}
        open={merchantDetailId !== null}
        onOpenChange={(o) => {
          if (!o) setMerchantDetailId(null);
        }}
        onStatusApplied={() => refetchMerchants()}
      />
    </div>
  );
}
