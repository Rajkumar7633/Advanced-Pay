'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Repeat, CreditCard, Clock, Activity, Settings, 
  TrendingUp, Users, DollarSign, Calendar
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatting';

export default function SubscriptionsDashboardPage() {
  const [activeTab, setActiveTab] = useState('active');

  // Simulated subscription data pulled via SWR/RQ hooks in a real deployment
  const mrr = 14250.00;
  const activeSubs = 284;
  const churnRate = 1.2;

  const mockSubscriptions = [
    { id: 'sub_1092831', customer: 'john.doe@example.com', plan: 'Pro SaaS Tier', amount: 99.00, status: 'active', next_billing: new Date(Date.now() + 86400000 * 3).toISOString() },
    { id: 'sub_8821919', customer: 'enterprise@corp.com', plan: 'Enterprise API', amount: 499.00, status: 'active', next_billing: new Date(Date.now() + 86400000 * 12).toISOString() },
    { id: 'sub_2838112', customer: 'startup_guy@gmail.com', plan: 'Basic', amount: 29.00, status: 'past_due', next_billing: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Billing</h1>
          <p className="text-muted-foreground mt-1">Autonomous Subscription & SaaS Management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2"><Settings className="w-4 h-4" /> Billing Settings</Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"><Repeat className="w-4 h-4" /> Create Subscription</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 shadow-sm border-indigo-100 dark:border-indigo-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Monthly Recurring Revenue (MRR)</p>
                <p className="text-4xl font-black mt-2 text-indigo-900 dark:text-indigo-100">₹{formatNumber(mrr)}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400"><DollarSign className="w-6 h-6" /></div>
            </div>
            <div className="flex flex-row items-center mt-6 text-sm text-emerald-600 font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +12.5% vs last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 shadow-sm border-blue-100 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Subscribers</p>
                <p className="text-4xl font-black mt-2 text-blue-900 dark:text-blue-100">{activeSubs}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400"><Users className="w-6 h-6" /></div>
            </div>
            <div className="flex flex-row items-center mt-6 text-sm text-emerald-600 font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +42 new this week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 dark:from-red-900/20 shadow-sm border-red-100 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Churn Rate</p>
                <p className="text-4xl font-black mt-2 text-red-900 dark:text-red-100">{churnRate}%</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-400"><Activity className="w-6 h-6" /></div>
            </div>
            <div className="flex flex-row items-center mt-6 text-sm text-red-600 font-medium">
              Stable health tracking
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Autonomous Mandates</CardTitle>
              <CardDescription>Zero-Downtime vaulted tokens actively firing on schedule</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Subscription ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Plan / Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Next Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium">{sub.id}</td>
                    <td className="px-6 py-4">{sub.customer}</td>
                    <td className="px-6 py-4 font-medium">
                      <div>{sub.plan}</div>
                      <div className="text-muted-foreground text-xs font-mono">₹{formatNumber(sub.amount)}/cycle</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={sub.status === 'active' ? 'default' : 'destructive'} 
                             className={sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatDate(sub.next_billing)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
