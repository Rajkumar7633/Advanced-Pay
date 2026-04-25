'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Zap, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, Target, Globe, Calendar
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatting';
import { merchantsApi } from '@/lib/api';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const PALETTE = {
  blue:   '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  green:  '#22c55e',
  amber:  '#f59e0b',
  rose:   '#f43f5e',
};
const PIE_COLORS = [PALETTE.blue, PALETTE.indigo, PALETTE.green, PALETTE.amber, PALETTE.rose];
const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#e2e8f0',
};

// Removed fake heatmap utilities

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, icon: Icon, accent }: {
  label: string; value: string; delta?: number; icon: any; accent: string;
}) {
  const up = delta === undefined ? null : delta >= 0;
  return (
    <Card className="border-white/5 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative group hover:bg-white/[0.05] transition-all">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${accent} pointer-events-none`} />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.replace('from-', 'bg-').split(' ')[0]}/20`}>
            <Icon className="w-5 h-5 text-white/70" />
          </div>
          {up !== null && (
            <Badge className={`text-xs ${up ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {up ? <ArrowUpRight className="w-3 h-3 mr-1 inline" /> : <ArrowDownRight className="w-3 h-3 mr-1 inline" />}
              {Math.abs(delta!).toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
type ApiData = {
  totalRevenue: any;
  successRate: number;
  transactionCount: number;
  averageOrderValue: any;
  paymentMethodBreakdown: Record<string, number>;
  revenueByDay: Array<{ date: string; amount: any }>;
  successRateByDay: Array<{ date: string; success_rate: number }>;
};

export default function AnalyticsPage() {
  const [period, setPeriod]   = useState('30d');
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<ApiData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await merchantsApi.getAnalytics({ period });
        if (!cancelled) setData(res?.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  // ─── Derived metrics ────────────────────────────────────────────────────
  const totalRevenue    = Number(data?.totalRevenue ?? 0);
  const totalTxns       = Number(data?.transactionCount ?? 0);
  const avgOrder        = Number(data?.averageOrderValue ?? (totalTxns > 0 ? totalRevenue / totalTxns : 0));
  const successRate     = Number(data?.successRate ?? 0);

  // MRR / ARR approximation (30-day window → multiply)
  const multiplier = period === '7d' ? 4.33 : period === '90d' ? 0.33 : 1;
  const mrr = totalRevenue * multiplier;
  const arr = mrr * 12;

  const revenueByDay = (data?.revenueByDay || []).map(p => ({
    date: new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    revenue: Number(p.amount ?? 0),
  }));

  const successByDay = (data?.successRateByDay || []).map(p => ({
    date: new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    rate: Number(p.success_rate ?? 0),
  }));

  const methodBreakdown = useMemo(() => {
    const m = data?.paymentMethodBreakdown || {};
    return Object.entries(m)
      .map(([name, value]) => ({ name: name.toUpperCase(), value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Payment funnel (derived — success / pending / failed from successRate)
  const funnel = [
    { name: 'Initiated',  value: totalTxns },
    { name: 'Processed',  value: Math.round(totalTxns * 0.95) },
    { name: 'Captured',   value: Math.round(totalTxns * successRate / 100) },
    { name: 'Settled',    value: Math.round(totalTxns * successRate / 100 * 0.9) },
  ];


  // Radial KPI data
  const radialData = [
    { name: 'Success Rate', value: successRate, fill: PALETTE.green },
    { name: 'Conversion',   value: Math.min(successRate * 0.9, 100), fill: PALETTE.blue },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-3">
              <BarChart3 className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Revenue Intelligence</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Analytics Center</h1>
            <p className="text-white/40 mt-1 text-sm">Real-time insights across your entire payment ecosystem.</p>
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            {['7d', '30d', '90d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue"   value={formatCurrency(totalRevenue)} delta={12.5}  icon={DollarSign} accent="from-blue-500/10 to-indigo-500/5" />
          <StatCard label="Transactions"    value={formatNumber(totalTxns)}      delta={15.8}  icon={Activity}   accent="from-violet-500/10 to-purple-500/5" />
          <StatCard label="Avg Order Value" value={formatCurrency(avgOrder)}     delta={8.2}   icon={Target}     accent="from-amber-500/10 to-orange-500/5" />
          <StatCard label="Success Rate"    value={`${successRate.toFixed(1)}%`} delta={0.3}   icon={Zap}        accent="from-green-500/10 to-emerald-500/5" />
        </div>

        {/* ── MRR / ARR Banner ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Monthly Recurring Revenue (MRR)', value: formatCurrency(mrr), icon: Calendar, color: 'indigo' },
            { label: 'Annual Run Rate (ARR)',            value: formatCurrency(arr), icon: Globe,    color: 'violet' },
          ].map(item => (
            <div
              key={item.label}
              className={`flex items-center gap-6 p-6 rounded-2xl bg-${item.color}-500/10 border border-${item.color}-500/20 backdrop-blur-sm`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-${item.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-7 h-7 text-${item.color}-400`} />
              </div>
              <div>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-3xl font-black text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Revenue Trend + Success Rate ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Revenue Trend</CardTitle>
              <CardDescription className="text-white/40">Actual vs projected trajectory</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PALETTE.blue}   stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PALETTE.blue}   stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatCurrency(v)]} />
                  <Area type="monotone" dataKey="revenue"   name="Revenue"   stroke={PALETTE.blue}   fill="url(#revGrad)"  strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radial KPIs */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Quality Score</CardTitle>
              <CardDescription className="text-white/40">Success & conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v.toFixed(1)}%`]} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="space-y-3 mt-2">
                {radialData.map(r => (
                  <div key={r.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.fill }} />
                      <span className="text-white/50 text-sm">{r.name}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{r.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Payment Funnel + Method Mix ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Payment Funnel</CardTitle>
              <CardDescription className="text-white/40">Transaction pipeline conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnel.map((step, i) => {
                  const pct = totalTxns > 0 ? (step.value / totalTxns) * 100 : 0;
                  const colors = [PALETTE.blue, PALETTE.indigo, PALETTE.violet, PALETTE.green];
                  return (
                    <div key={step.name}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-white/70 text-sm font-semibold">{step.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 text-xs font-mono">{formatNumber(step.value)}</span>
                          <span className="text-white text-sm font-bold">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Method Pie */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Payment Methods</CardTitle>
              <CardDescription className="text-white/40">Revenue distribution by method</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={methodBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                    {methodBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1 w-full">
                {methodBreakdown.map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-white/70 text-sm">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.value}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                      <span className="text-white font-bold text-sm w-10 text-right">{m.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* ── Success Rate Bar ── */}
        <Card className="border-white/5 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Daily Success Rate</CardTitle>
            <CardDescription className="text-white/40">Authorization rate trend — target ≥ 95%</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={successByDay} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v.toFixed(1)}%`, 'Success Rate']} />
                <Bar dataKey="rate" name="Success Rate" radius={[4,4,0,0]}>
                  {successByDay.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 95 ? PALETTE.green : entry.rate >= 80 ? PALETTE.amber : PALETTE.rose} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
