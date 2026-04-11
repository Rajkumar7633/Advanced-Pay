'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/formatting';
import { merchantsApi } from '@/lib/api';

const COLORS = ['#0066ff', '#00b894', '#fdcb6e', '#ff7675'];

type AnalyticsApiResponse = {
  totalRevenue: any;
  successRate: number;
  transactionCount: number;
  averageOrderValue: any;
  paymentMethodBreakdown: Record<string, number>;
  revenueByDay: Array<{ date: string; amount: any }>;
  successRateByDay: Array<{ date: string; success_rate: number }>;
};

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const res = await merchantsApi.getAnalytics({ period: selectedPeriod });
        if (!cancelled) setData(res?.data);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  const revenueByDay = (data?.revenueByDay || []).map((p) => ({ date: p.date, revenue: Number(p.amount ?? 0) }));
  const successRateByDay = (data?.successRateByDay || []).map((p) => ({ date: p.date, successRate: Number(p.success_rate ?? 0) }));

  const paymentMethodBreakdown = useMemo(() => {
    const m = data?.paymentMethodBreakdown || {};
    return Object.entries(m)
      .map(([name, value]) => ({ name: name.toUpperCase(), value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalRevenue = Number(data?.totalRevenue ?? 0);
  const totalTransactions = Number(data?.transactionCount ?? 0);
  const avgOrderValue = Number(data?.averageOrderValue ?? 0);
  const successRate = Number(data?.successRate ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">Track your payment metrics and insights</p>
          </div>

          <div className="mb-6 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('7d')} className={selectedPeriod === '7d' ? 'bg-accent text-accent-foreground' : ''}>
              7D
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('30d')} className={selectedPeriod === '30d' ? 'bg-accent text-accent-foreground' : ''}>
              30D
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('90d')} className={selectedPeriod === '90d' ? 'bg-accent text-accent-foreground' : ''}>
              90D
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-green-600 mt-2">↑ 12.5% vs last week</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Transaction Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(avgOrderValue || (totalTransactions > 0 ? totalRevenue / totalTransactions : 0))}
                </div>
                <p className="text-xs text-green-600 mt-2">↑ 8.2% vs last week</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {successRate.toFixed(1)}%
                </div>
                <p className="text-xs text-green-600 mt-2">↑ 0.3% vs last week</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatNumber(totalTransactions)}
                </div>
                <p className="text-xs text-green-600 mt-2">↑ 15.8% vs last week</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue Chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue vs target</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#0066ff" strokeWidth={2} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Success Rate Chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Success Rate Trend</CardTitle>
                <CardDescription>Daily payment success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={successRateByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value) => `${value}%`}
                    />
                    <Bar dataKey="successRate" fill="#00b894" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution by transaction count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Total revenue per method</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethodBreakdown.map((method, index) => (
                    <div key={method.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        ></div>
                        <div>
                          <p className="font-medium text-foreground">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.value}% of transactions</p>
                        </div>
                      </div>
                      <p className="font-semibold text-foreground">{formatNumber(method.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}
