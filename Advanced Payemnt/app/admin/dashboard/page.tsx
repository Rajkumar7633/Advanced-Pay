'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, Users, DollarSign, ShieldAlert, ArrowUpRight, 
  Settings, Clock, CheckCircle2, Shield, AlertTriangle, XCircle, Activity,
  ServerCrash, RefreshCw, LogOut, Scale, TrendingUp, Info, CheckCircle,
  Trophy, Server, Cpu, Globe, Zap, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line,
  BarChart, Bar
} from 'recharts';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatting';
import {
  useAdminMetrics, useAdminMerchants, useAdminMutateMerchantStatus,
  useAdminDisputes, useAdminActivity, useAdminResolveDispute, useAdminTransactions,
  useAdminSettings, useAdminMutateSettings,
  useAdminHealth, useAdminWebhookStats, useAdminRiskTransactions, useAdminRefundTransaction,
  useAdminSettlements, useAdminApproveSettlement, useAdminRoutingStats
} from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/admin-nav';
import { MerchantDetailSheet } from '@/components/admin/merchant-detail-sheet';

const REASON_LABELS: Record<string, string> = {
  fraudulent: 'Fraudulent',
  product_not_received: 'Product Not Received',
  duplicate: 'Duplicate Charge',
  subscription_canceled: 'Subscription Canceled',
  general: 'General',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]   = useState('overview');
  const [resolveModal, setResolveModal] = useState<{ id: string; merchant: string; amount: string } | null>(null);
  const [merchantDetailId, setMerchantDetailId] = useState<string | null>(null);

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth !== 'true') router.replace('/admin/login');
    }
  }, [router]);

  // Fetch data — NO refetchInterval to stop auto-reload every minute
  const { data: metrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useAdminMetrics();
  const { data: merchantsList, refetch: refetchMerchants } = useAdminMerchants();
  const { data: disputesList, refetch: refetchDisputes }   = useAdminDisputes();
  const { data: activityList, refetch: refetchActivity }   = useAdminActivity();
  const { data: transactionsList, refetch: refetchTransactions } = useAdminTransactions();
  const { data: settings, refetch: refetchSettings } = useAdminSettings();
  const { data: healthStats, refetch: refetchHealth } = useAdminHealth();
  const { data: webhookStats, refetch: refetchWebhooks } = useAdminWebhookStats();
  const { data: riskTransactions, refetch: refetchRisk } = useAdminRiskTransactions();

  const merchantMutation = useAdminMutateMerchantStatus();
  const resolveMutation  = useAdminResolveDispute();
  const settingsMutation = useAdminMutateSettings();
  const refundMutation   = useAdminRefundTransaction();
  const approveSettlementMutation = useAdminApproveSettlement();

  const { data: settlementsList, refetch: refetchSettlements } = useAdminSettlements();
  const { data: routingStats, refetch: refetchRouting } = useAdminRoutingStats();

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastActivityCount, setLastActivityCount] = useState(0);

  const [localFees, setLocalFees] = useState({ card_fee: '2.9', upi_fee: '0.0', netbanking_fee: '1.5' });
  useEffect(() => {
    if (settings) {
      setLocalFees({ card_fee: settings.card_fee || '2.9', upi_fee: settings.upi_fee || '0.0', netbanking_fee: settings.netbanking_fee || '1.5' });
    }
  }, [settings]);

  // Voice "Soundbox" Logic
  useEffect(() => {
    if (voiceEnabled && activityList && activityList.length > lastActivityCount) {
      const latest = activityList[0];
      if (latest.type === 'success' && 'speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(latest.message.replace('New transaction', 'Payment received'));
        msg.rate = 0.9;
        msg.pitch = 1.1;
        window.speechSynthesis.speak(msg);
      }
      setLastActivityCount(activityList.length);
    }
  }, [activityList, voiceEnabled, lastActivityCount]);

  // Phase 13: Admin God-Mode Real-Time Omniscient Pulse
  useEffect(() => {
    let ws: WebSocket;
    if (typeof window !== 'undefined') {
      // Connecting as `superadmin` routes all global traffic clones to this listener
      ws = new WebSocket(`ws://localhost:8080/api/v1/ws/pulse?token=superadmin`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "PAYMENT_SUCCESS") {
            // God Mode Interception Toast
            toast.success(`🌍 Global Platform Activity`, {
                description: `A merchant just received ${data.currency} ${data.amount} (Tracking ID: ${data.order_id})`,
                duration: 6000,
            });

            // Omniscient Voice Confirms
            if (voiceEnabled && 'speechSynthesis' in window) {
              const msg = new SpeechSynthesisUtterance(`Platform received ${data.amount} ${data.currency}.`);
              msg.rate = 1.2;
              msg.pitch = 1.0;
              window.speechSynthesis.speak(msg);
            }

            // Instruct the dashboard to hot-fetch immediately to update charts natively
            refetchMetrics();
            refetchTransactions();
          }
        } catch (e) {
          console.error("SuperAdmin Pulse Payload exception:", e);
        }
      };
    }
    return () => {
      if (ws) ws.close();
    };
  }, [voiceEnabled, refetchMetrics, refetchTransactions]);

  const transactions = transactionsList || [];
  const disputes = disputesList || [];
  const merchants = merchantsList || [];

  const openDisputes     = disputes.filter(d => d.status === 'open').length;
  const pendingMerchants = merchants.filter(m => m.status === 'pending').length;

  const handleRefreshAll = () => {
    refetchMetrics(); refetchMerchants(); refetchDisputes(); 
    refetchActivity(); refetchTransactions(); refetchSettings();
    refetchHealth(); refetchWebhooks(); refetchRisk();
    refetchSettlements(); refetchRouting();
    toast.success('All data refreshed');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  if (isLoadingMetrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Loading Admin Dashboard…</p>
      </div>
    );
  }

  const handleResolve = async (status: 'won' | 'lost' | 'closed') => {
    if (!resolveModal) return;
    try {
      await resolveMutation.mutateAsync({ disputeId: resolveModal.id, status });
      toast.success(`Dispute resolved as ${status.toUpperCase()}`, { description: resolveModal.merchant });
      setResolveModal(null);
      refetchDisputes();
      refetchMetrics();
    } catch {
      toast.error('Failed to resolve dispute');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background relative overflow-hidden">
      {/* Glassmorphic Ambient Mesh Overlay */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* ── Top Navigation Bar ── */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur-3xl sticky top-0 z-40 transition-all shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Advanced Pay OS</h1>
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">God-Mode Access</p>
            </div>
          </div>

          <AdminNav className="order-last w-full justify-center lg:order-none lg:w-auto" />

          <div className="flex items-center gap-3">
            {openDisputes > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-300 font-bold animate-pulse">
                🚨 {openDisputes} Open {openDisputes === 1 ? 'Dispute' : 'Disputes'}
              </Badge>
            )}
            {pendingMerchants > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 font-bold">
                ⏳ {pendingMerchants} Pending KYC
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
            <Button size="sm" variant={voiceEnabled ? "default" : "outline"} onClick={() => setVoiceEnabled(!voiceEnabled)} className={`gap-2 h-8 ${voiceEnabled ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
              <Zap className={`w-3 h-3 ${voiceEnabled ? 'animate-pulse' : ''}`} /> {voiceEnabled ? 'Soundbox ON' : 'Soundbox OFF'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRefreshAll} className="gap-2 h-8">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="gap-2 h-8 text-red-600 hover:bg-red-50">
              <LogOut className="w-3 h-3" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">

        {/* ── Metrics Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 relative z-10">
          {[
            { label: 'Global Platform Volume', value: metrics ? formatCurrency(parseFloat(metrics.total_volume)) : '₹0', icon: Globe, color: 'from-indigo-600/10 via-blue-500/5 to-transparent border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Worldwide Merchants',    value: metrics ? formatNumber(metrics.active_merchants) : '0', icon: Users, color: 'from-cyan-600/10 via-blue-500/5 to-transparent border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
            { label: 'Open Platform Disputes', value: String(openDisputes), icon: ShieldAlert, color: openDisputes > 0 ? 'from-red-500/10 border-red-500/20' : 'from-emerald-500/10 border-emerald-500/20', text: openDisputes > 0 ? 'text-red-500' : 'text-emerald-500' },
            { label: 'Network Pending Actions',value: metrics ? String(metrics.pending_items) : '0', icon: Activity, color: 'from-amber-500/10 border-amber-500/20', text: 'text-amber-500 dark:text-amber-400' },
          ].map(({ label, value, icon: Icon, color, text }) => (
            <Card key={label} className={`bg-gradient-to-br ${color} bg-card/60 backdrop-blur-xl border shadow-sm transition-all hover:scale-[1.02] hover:shadow-md cursor-default overflow-hidden relative group`}>
              {/* Micro-Animation Glimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:animate-[glimmer_1.5s_infinite]" />
              
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                  <div className={`p-2 rounded-lg bg-background/50 ${text}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className={`text-3xl font-black ${text}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            {[
              { value: 'overview',      label: 'Overview',     icon: BarChart3, path: null },
              { value: 'transactions',  label: 'Transactions', icon: DollarSign, path: null },
              { value: 'settlements',   label: 'Settlements',  icon: Clock, path: null },
              { value: 'routing',       label: 'AI Routing',   icon: Zap, path: null },
              { value: 'disputes',      label: 'Disputes',     icon: Scale, path: null },
              { value: 'risk',          label: 'Risk Center',  icon: ShieldAlert, path: '/admin/risk' },
              { value: 'operations',    label: 'Operations',   icon: CheckCircle, path: '/admin/operations' },
              { value: 'merchants',     label: 'Merchants',    icon: Users, path: null },
              { value: 'system',        label: 'System',       icon: Settings, path: null },
            ].map(({ value, label, icon: Icon, path }) => (
              path ? (
                <div key={value} onClick={() => router.push(path)} className="flex items-center gap-1.5 px-5 py-2 rounded-lg font-semibold cursor-pointer hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground">
                  <Icon className="w-4 h-4" />{label}
                </div>
              ) : (
                <TabsTrigger key={value} value={value}
                  className="data-[state=active]:bg-background data-[state=active]:shadow flex items-center gap-1.5 px-5 py-2 rounded-lg font-semibold">
                  <Icon className="w-4 h-4" />{label}
                </TabsTrigger>
              )
            ))}
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-md border-border/60">
                <CardHeader>
                  <CardTitle>Transaction Volume (Last 24h)</CardTitle>
                  <CardDescription>Live hourly transaction count and success rate from your payment pipeline</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {(metrics?.transactions_data || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics!.transactions_data}>
                        <defs>
                          <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                        <Area type="monotone" dataKey="transactions" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorTx)" name="Transactions" />
                        <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Success %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto opacity-20 mb-3" />
                        <p className="text-sm">No transactions in the last 24 hours yet</p>
                        <p className="text-xs mt-1">Data will appear after your first payment is processed</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-md border-border/60">
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                  <CardDescription>Recent events from your payment pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(activityList || []).slice(0, 10).map((item, i) => {
                      const Icon = item.type === 'success' ? CheckCircle : item.type === 'critical' ? ShieldAlert : item.type === 'warning' ? AlertTriangle : Info;
                      const cls  = { success: 'bg-green-100 text-green-600', critical: 'bg-red-100 text-red-600', warning: 'bg-amber-100 text-amber-600', info: 'bg-blue-100 text-blue-600' }[item.type];
                      return (
                        <div key={i} className="flex gap-3 items-start">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${cls}`}><Icon className="w-3 h-3" /></div>
                          <div>
                            <p className="text-xs font-semibold leading-tight">{item.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                          </div>
                        </div>
                      );
                    })}
                    {(activityList || []).length === 0 && (
                      <div className="py-10 text-center">
                        <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No platform activity yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TRANSACTIONS */}
          <TabsContent value="transactions" className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">All Transactions</h2>
                <p className="text-muted-foreground text-sm">System-wide view of all payment activity.</p>
              </div>
            </div>

            <Card className="shadow-md border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {['ID', 'Merchant', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                        <th key={h} className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">#{t.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 font-semibold">{t.merchant}</td>
                        <td className="py-3 px-4 font-bold">{formatCurrency(parseFloat(t.amount || '0'))}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs uppercase">{t.method}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            t.status === 'completed' || t.status === 'success' || t.status === 'captured' ? 'bg-green-100 text-green-700' :
                            t.status === 'failed'   ? 'bg-red-100 text-red-700' :
                            t.status === 'refunded' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{t.status}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{t.created_at}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No transactions available yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* DISPUTES */}
          <TabsContent value="disputes" className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Dispute Resolution Center</h2>
                <p className="text-muted-foreground text-sm">All merchant chargebacks and complaints — resolve directly from here.</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700">Open: {disputes.filter(d => d.status === 'open').length}</span>
                <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">Review: {disputes.filter(d => d.status === 'under_review').length}</span>
                <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700">Won: {disputes.filter(d => d.status === 'won').length}</span>
                <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">Lost: {disputes.filter(d => d.status === 'lost').length}</span>
              </div>
            </div>

            <Card className="shadow-md border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {['ID', 'Merchant', 'Amount', 'Reason', 'Filed On', 'Status', 'Action'].map(h => (
                        <th key={h} className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {disputes.map(d => (
                      <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">#{d.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 font-semibold">{d.merchant}</td>
                        <td className="py-3 px-4 font-bold text-red-600">{formatCurrency(parseFloat(d.amount || '0'))}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{REASON_LABELS[d.reason] || d.reason}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{d.created_at}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            d.status === 'open'         ? 'bg-red-100 text-red-700' :
                            d.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                            d.status === 'won'          ? 'bg-green-100 text-green-700' :
                            d.status === 'lost'         ? 'bg-gray-100 text-gray-600' :
                            'bg-blue-100 text-blue-700'
                          }`}>{d.status.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3 px-4">
                          {(d.status === 'open' || d.status === 'under_review') ? (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs font-bold"
                              onClick={() => setResolveModal({ id: d.id, merchant: d.merchant, amount: formatCurrency(parseFloat(d.amount || '0')) })}>
                              <Scale className="w-3 h-3 mr-1" /> Resolve
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {disputes.length === 0 && (
                      <tr><td colSpan={7} className="py-16 text-center">
                        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                        <p className="text-muted-foreground font-medium">No disputes on the platform 🎉</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* MERCHANTS */}
          <TabsContent value="merchants" className="mt-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Merchant Management</h2>
              <p className="text-muted-foreground text-sm">Approve or suspend merchants. All changes are live immediately.</p>
            </div>

            <Card className="shadow-md border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {['Merchant', 'Joined', 'Volume', 'Status', 'Actions'].map(h => (
                        <th key={h} className="py-3 px-5 text-xs font-bold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {merchants.map(m => (
                      <tr key={m.id} className="transition-colors hover:bg-muted/20">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold">{m.name}</p>
                              <p className="text-xs font-mono text-muted-foreground">{m.id.slice(0, 12)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-muted-foreground">{formatDate(m.date)}</td>
                        <td className="py-4 px-5 font-bold">{formatCurrency(parseFloat(m.volume || '0'))}</td>
                        <td className="py-4 px-5">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold capitalize ${
                              m.status === 'approved' || m.status === 'active'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                : m.status === 'pending'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                  : m.status === 'suspended'
                                    ? 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300'
                                    : 'border-border bg-muted text-muted-foreground'
                            }`}
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 gap-1 text-xs"
                              onClick={() => setMerchantDetailId(m.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </Button>
                            {m.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                                  onClick={async () => {
                                    try {
                                      await merchantMutation.mutateAsync({ merchantId: m.id, status: 'approved' });
                                      toast.success(`${m.name} approved`);
                                      refetchMerchants();
                                      refetchMetrics();
                                    } catch {
                                      toast.error('Approve failed');
                                    }
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-destructive/40 text-xs text-destructive"
                                  onClick={async () => {
                                    try {
                                      await merchantMutation.mutateAsync({ merchantId: m.id, status: 'suspended' });
                                      toast.message(`${m.name} on hold`, { description: 'Suspended until KYC cleared.' });
                                      refetchMerchants();
                                      refetchMetrics();
                                    } catch {
                                      toast.error('Update failed');
                                    }
                                  }}
                                >
                                  Hold
                                </Button>
                              </>
                            )}
                            {(m.status === 'active' || m.status === 'approved') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-destructive/40 text-xs text-destructive"
                                onClick={async () => {
                                  try {
                                    await merchantMutation.mutateAsync({ merchantId: m.id, status: 'suspended' });
                                    toast.success(`${m.name} suspended`);
                                    refetchMerchants();
                                    refetchMetrics();
                                  } catch {
                                    toast.error('Suspend failed');
                                  }
                                }}
                              >
                                Suspend
                              </Button>
                            )}
                            {m.status === 'suspended' && (
                              <Button
                                size="sm"
                                className="h-8 bg-primary text-xs"
                                onClick={async () => {
                                  try {
                                    await merchantMutation.mutateAsync({ merchantId: m.id, status: 'active' });
                                    toast.success(`${m.name} reactivated`);
                                    refetchMerchants();
                                    refetchMetrics();
                                  } catch {
                                    toast.error('Reactivate failed');
                                  }
                                }}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {merchants.length === 0 && (
                      <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No merchants registered yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* SYSTEM */}
          <TabsContent value="system" className="mt-6 space-y-5">
            <h2 className="text-xl font-bold">System Configuration</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-md border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-600" /> Platform Fee Config</CardTitle>
                  <CardDescription>Transaction fee rates applied globally across all merchants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Card Transactions', key: 'card_fee', value: localFees.card_fee },
                    { label: 'UPI Transactions',  key: 'upi_fee', value: localFees.upi_fee },
                    { label: 'Net Banking',        key: 'netbanking_fee', value: localFees.netbanking_fee },
                  ].map(fee => (
                    <div key={fee.key}>
                      <label className="text-xs font-bold text-muted-foreground uppercase">{fee.label} (%)</label>
                      <div className="flex gap-2 mt-1">
                        <input type="number" value={fee.value} step="0.1" 
                          onChange={(e) => setLocalFees(prev => ({ ...prev, [fee.key]: e.target.value }))}
                          className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        <div className="bg-muted px-3 py-2 rounded-lg font-bold text-muted-foreground">%</div>
                      </div>
                    </div>
                  ))}
                  <Button disabled={settingsMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 font-bold mt-2"
                    onClick={async () => {
                      try {
                        await settingsMutation.mutateAsync(localFees);
                        toast.success('Platform fee configuration saved successfully!');
                      } catch {
                        toast.error('Failed to save fee configuration');
                      }
                    }}>
                    {settingsMutation.isPending ? 'Saving...' : 'Save Fee Config'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-md border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-600" /> Platform Controls</CardTitle>
                  <CardDescription>Global toggles that affect the entire payment network</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Auto Merchant Approval', key: 'auto_approve_merchants', desc: 'Auto-approve merchants with valid KYC docs' },
                    { label: 'Fraud Score Blocking',   key: 'fraud_blocking', desc: 'Block transactions with fraud score > 60' },
                    { label: 'International Payments', key: 'international_payments', desc: 'Allow cross-border transactions' },
                    { label: 'Maintenance Mode',       key: 'maintenance_mode', desc: 'Halt all new payments platform-wide' },
                  ].map(t => {
                    const isOn = settings ? (settings as any)[t.key] : false;
                    return (
                      <div key={t.key} className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isOn ? 'bg-green-50 border-green-200' : 'bg-muted/10 border-border'}`}
                        onClick={async () => {
                          if (!settings) return;
                          try {
                            const updated = !isOn;
                            await settingsMutation.mutateAsync({ [t.key]: updated });
                            toast[updated ? 'success' : 'info'](`${t.label} turned ${updated ? 'ON' : 'OFF'}`);
                          } catch {
                            toast.error(`Failed to toggle ${t.label}`);
                          }
                        }}>
                        <div>
                          <p className={`font-bold text-sm ${isOn ? 'text-green-800' : 'text-foreground'}`}>{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </div>
                        <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 ${isOn ? 'bg-green-500 justify-end' : 'bg-muted justify-start'}`}>
                          <div className="w-5 h-5 rounded-full bg-white shadow" />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* ADMIN SYSTEM HEALTH & WEBHOOKS */}
              <Card className="shadow-md border-border/60 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" /> Infrastructure Diagnostics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Rate Limiting Health */}
                    <div className="border rounded-xl p-4 bg-muted/10">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-sm">Redis Rate Limiter</span>
                        <Badge className={healthStats?.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {healthStats?.status || 'disused'}
                        </Badge>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Current TPS</p>
                          <p className="text-2xl font-black">{healthStats?.live_tps || '0'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Blocks/min</p>
                          <p className="text-2xl font-black text-amber-600">{healthStats?.blocks_last_minute || '0'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Delivery Engine */}
                    <div className="border rounded-xl p-4 bg-muted/10">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-sm">Webhook Engine</span>
                        <div className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Polling</div>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Pending Queue</p>
                          <p className="text-2xl font-black text-amber-600">{webhookStats?.pending || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Failed Delivery</p>
                          <p className="text-2xl font-black text-red-600">{webhookStats?.failed || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Completed</p>
                          <p className="text-2xl font-black text-green-600">{webhookStats?.completed || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* RISK CENTER */}
          <TabsContent value="risk" className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-red-600" /> Risk Control Center
                </h2>
                <p className="text-muted-foreground">Predictive fraud scores and intercept controls.</p>
              </div>
            </div>
            
            <Card className="shadow-md border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-50/50 border-b border-red-100 text-red-900 border-border/50">
                    <tr>
                      <th className="py-3 px-5 text-left font-bold w-[250px]">TRANSACTION ID</th>
                      <th className="py-3 px-5 text-left font-bold">MERCHANT</th>
                      <th className="py-3 px-5 text-left font-bold">AMOUNT</th>
                      <th className="py-3 px-5 text-left font-bold">FRAUD SCORE</th>
                      <th className="py-3 px-5 text-left font-bold">STATUS</th>
                      <th className="py-3 px-5 text-left font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {riskTransactions?.map((tx: any) => {
                      const isRefunded = tx.status === 'refunded';
                      
                      // Using ts-ignore since we extended the type dynamically via our API logic mapping.
                      return (
                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-4 px-5 font-mono text-xs">{tx.id}</td>
                          <td className="py-4 px-5 font-semibold text-muted-foreground">{tx.merchant}</td>
                          <td className="py-4 px-5 font-black text-red-700">{formatCurrency(parseFloat(tx.amount || '0'))}</td>
                          <td className="py-4 px-5">
                            <Badge className="bg-red-600 text-white animate-pulse">Critical Risk</Badge>
                          </td>
                          <td className="py-4 px-5">
                            <Badge className={isRefunded ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-5">
                            <Button 
                              size="sm" 
                              disabled={isRefunded || refundMutation.isPending}
                              className={isRefunded ? 'bg-muted text-muted-foreground' : 'bg-red-600 hover:bg-red-700 text-white font-bold h-8'}
                              onClick={() => {
                                if (window.confirm("Are you sure you want to intercept and force refund this transaction?")) {
                                  refundMutation.mutate(tx.id);
                                  toast.success("Transaction successfully force refunded");
                                }
                              }}
                            >
                              {isRefunded ? 'Actioned' : 'Force Refund'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {!riskTransactions || riskTransactions.length === 0 && (
                      <tr><td colSpan={6} className="py-16 text-center text-muted-foreground flex flex-col items-center">
                        <Shield className="w-12 h-12 text-green-300 mb-3" />
                        <span className="font-bold text-green-700 text-lg">Platform Secure</span>
                        <span className="text-sm">No high-risk transactions detected</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* SETTLEMENTS */}
          <TabsContent value="settlements" className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-600" /> Automated Payouts
                </h2>
                <p className="text-muted-foreground">Monitor and approve merchant settlement batches.</p>
              </div>
            </div>

            <Card className="shadow-md border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {['Batch ID', 'Merchant', 'Amount', 'Fees', 'Net', 'Status', 'Action'].map(h => (
                        <th key={h} className="py-3 px-5 text-left font-bold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(settlementsList || []).map(s => (
                      <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-5 font-mono text-xs text-blue-600">#{s.id.slice(0, 8)}</td>
                        <td className="py-4 px-5 font-medium">{s.merchant_id.slice(0, 8)}...</td>
                        <td className="py-4 px-5 font-bold">{formatCurrency(parseFloat(s.total_amount))}</td>
                        <td className="py-4 px-5 text-red-600 font-medium">-{formatCurrency(parseFloat(s.fees))}</td>
                        <td className="py-4 px-5 font-black text-green-700">{formatCurrency(parseFloat(s.net_amount))}</td>
                        <td className="py-4 px-5">
                          <Badge className={s.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                            {s.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-4 px-5">
                          {s.status === 'pending' ? (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold"
                              onClick={() => {
                                approveSettlementMutation.mutate(s.id);
                                toast.success("Settlement approved successfully!");
                              }}>
                              Approve Payout
                            </Button>
                          ) : (
                            <div className="text-xs font-mono text-muted-foreground">UTR: {s.utr_number}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(settlementsList || []).length === 0 && (
                      <tr><td colSpan={7} className="py-20 text-center text-muted-foreground">No settlements found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* AI ROUTING */}
          <TabsContent value="routing" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" /> Active Traffic Distribution
                  </CardTitle>
                  <CardDescription>Real-time routing distribution based on provider health and cost</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {routingStats && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={routingStats.distribution} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="provider" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={24}>
                          {(routingStats.distribution || []).map((entry: any, index: number) => (
                            <div key={`cell-${index}`} style={{ fill: entry.status === 'active' ? '#2563eb' : '#f59e0b' }} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Routing Optimization Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[240px]">
                   <div className="relative w-40 h-40 flex items-center justify-center">
                     <svg className="w-full h-full transform -rotate-90">
                       <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-muted/10" />
                       <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" 
                               strokeDasharray={440} strokeDashoffset={440 - (440 * (routingStats?.optimization_score || 0)) / 100}
                               className="text-blue-600 transition-all duration-1000" />
                     </svg>
                     <span className="absolute text-4xl font-black">{routingStats?.optimization_score || 0}%</span>
                   </div>
                   <p className="mt-4 text-sm font-semibold text-muted-foreground uppercase tracking-widest">Efficiency Rating</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                 <CardHeader><CardTitle>Provider Health Status</CardTitle></CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {routingStats?.distribution?.map((p: any) => (
                         <div key={p.provider} className="p-4 border rounded-2xl flex items-center justify-between bg-card shadow-sm">
                            <span className="font-bold text-sm">{p.provider.toUpperCase()}</span>
                            <div className="flex items-center gap-1.5">
                               <div className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                               <span className={`text-xs font-bold ${p.status === 'active' ? 'text-green-700' : 'text-amber-700'}`}>
                                 {p.status.toUpperCase()}
                               </span>
                            </div>
                         </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Resolve Dispute Modal ── */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setResolveModal(null)}>
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl"><Scale className="w-6 h-6 text-blue-700" /></div>
              <div>
                <h2 className="text-lg font-bold">Resolve Dispute</h2>
                <p className="text-sm text-muted-foreground">{resolveModal.merchant} — {resolveModal.amount}</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <button onClick={() => handleResolve('won')} className="w-full p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 text-left">
                <div className="flex items-center gap-3"><Trophy className="w-5 h-5 text-green-600" /><div><p className="font-bold text-green-800">Mark WON</p><p className="text-xs text-muted-foreground">Merchant wins — dispute dismissed in their favour</p></div></div>
              </button>
              <button onClick={() => handleResolve('lost')} className="w-full p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-left">
                <div className="flex items-center gap-3"><XCircle className="w-5 h-5 text-red-600" /><div><p className="font-bold text-red-800">Mark LOST</p><p className="text-xs text-muted-foreground">Chargeback upheld — amount refunded to customer</p></div></div>
              </button>
              <button onClick={() => handleResolve('closed')} className="w-full p-4 rounded-xl border-2 border-border bg-muted/30 hover:bg-muted/50 text-left">
                <div className="flex items-center gap-3"><XCircle className="w-5 h-5 text-gray-500" /><div><p className="font-bold text-foreground">Close Without Verdict</p><p className="text-xs text-muted-foreground">Close the case with no outcome recorded</p></div></div>
              </button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setResolveModal(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <MerchantDetailSheet
        merchantId={merchantDetailId}
        open={merchantDetailId !== null}
        onOpenChange={(o) => {
          if (!o) setMerchantDetailId(null);
        }}
        onStatusApplied={() => {
          refetchMerchants();
          refetchMetrics();
        }}
      />
    </div>
  );
}
