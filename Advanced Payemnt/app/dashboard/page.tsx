'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  Download,
  Filter
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/formatting';
import { SmartRoutingWidget } from '@/components/dashboard/smart-routing-widget';
import { SuccessRateMonitor } from '@/components/dashboard/success-rate-monitor';
import { FraudScoreCard } from '@/components/dashboard/fraud-score-card';
import { BlockchainVerification } from '@/components/dashboard/blockchain-verification';
import { merchantsApi } from '@/lib/api';
import { toast } from 'sonner';

// Export type to be used by widgets
export type DashboardRecentTransaction = DashboardOverviewResponse['recent_transactions'][0];

const COLORS = ['#0066ff', '#00b894', '#fdcb6e', '#ff7675'];

type DashboardOverviewResponse = {
  total_revenue: any;
  total_transactions: number;
  success_rate: number;
  active_customers: number;
  revenue_trend: Array<{ date: string; amount: any }>;
  payment_method_breakdown: Array<{ name: string; value: number }>;
  recent_transactions: Array<{
    id: string;
    amount: any;
    status: string;
    date: string;
    method: string;
    customer_email?: string;
    fraud_score?: number;
    routing_decision?: string; // Stored as base64 or raw JSON string during serialization
  }>;
};

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const res = await merchantsApi.getDashboard({ period: selectedPeriod });
        if (!cancelled) setOverview(res?.data);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  // Auto-refresh dashboard every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await merchantsApi.getDashboard({ period: selectedPeriod });
        setOverview(res?.data);
      } catch (e) {
        console.error('Failed to refresh dashboard:', e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  // Phase 11: Real-Time Pulse WebSockets & Audial Notification
  useEffect(() => {
    let ws: WebSocket;
    const token = localStorage.getItem('token') || '';
    if (typeof window !== 'undefined') {
      ws = new WebSocket(`ws://localhost:8080/api/v1/ws/pulse?token=${token}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "PAYMENT_SUCCESS") {
            // Drop a spectacular visual toast
            toast.success(`⚡ Pulse: Secure Payment Received`, {
                description: `Total of ${data.currency} ${data.amount} has landed on Terminal ${data.order_id}`,
                duration: 6000,
            });

            // Fire Audial physical synthesizer
            const msg = new SpeechSynthesisUtterance(`Received ${data.amount} Rupees on Advanced Pay.`);
            msg.rate = 1.0;
            msg.pitch = 1.1;
            window.speechSynthesis.speak(msg);

            // Dynamically increment total Revenue & Transactions without refreshing
            setOverview(prev => prev ? {
               ...prev,
               total_revenue: Number(prev.total_revenue) + data.amount,
               total_transactions: prev.total_transactions + 1
            } : null);
          }
        } catch (e) {
          console.error("Pulse payload error:", e);
        }
      };
    }
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const revenueData = overview?.revenue_trend || [];
  const transactionData = overview?.payment_method_breakdown || [];
  const recentTransactions = overview?.recent_transactions || [];
  const totalRevenue = Number(overview?.total_revenue ?? 0);
  const totalTransactions = overview?.total_transactions ?? 0;
  const successRate = overview?.success_rate ?? 0;
  const activeCustomers = overview?.active_customers ?? 0;

  return (
    <div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your payment overview.</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Total Revenue
                  <DollarSign className="w-4 h-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold text-foreground">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {revenueData.length > 1 && (
                      <span className="text-green-600 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +{((revenueData[revenueData.length - 1]?.amount - revenueData[0]?.amount) / revenueData[0]?.amount * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Last 30 days
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Total Transactions
                  <CheckCircle className="w-4 h-4 text-success" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-2">
                  {formatNumber(totalTransactions)}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>8.2% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Success Rate
                  <TrendingUp className="w-4 h-4 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-2">
                  {successRate.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>0.8% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Active Customers
                  <Users className="w-4 h-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-2">
                  {formatNumber(activeCustomers)}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>5.3% from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Revenue Trend</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('7d')} 
                      className={selectedPeriod === '7d' ? 'bg-accent text-accent-foreground' : ''}>
                      7D
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('30d')}
                      className={selectedPeriod === '30d' ? 'bg-accent text-accent-foreground' : ''}>
                      30D
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('90d')}
                      className={selectedPeriod === '90d' ? 'bg-accent text-accent-foreground' : ''}>
                      90D
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#0066ff" strokeWidth={2} dot={{ fill: '#0066ff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={transactionData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {transactionData.map((entry, index) => (
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
          </div>

          {/* Master Plan Unique Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <SmartRoutingWidget recentTransactions={recentTransactions} />
            <SuccessRateMonitor />
            <FraudScoreCard recentTransactions={recentTransactions} />
            <BlockchainVerification />
          </div>

          {/* Recent Transactions */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Live Activity</CardTitle>
                <CardDescription>Real-time transaction feed</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentTransactions.slice(0, 5).map((tx, index) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        tx.status === 'success' || tx.status === 'completed' ? 'bg-green-500' : 
                        tx.status === 'initiated' || tx.status === 'processing' || tx.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium">{tx.customer_email || 'Guest'}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(tx.amount)} via {tx.method}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No recent transactions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="#0066ff" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
