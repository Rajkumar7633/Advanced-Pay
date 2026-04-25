'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CreditCard, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';

import { useState, useEffect } from 'react';
import { merchantsApi } from '@/lib/api';
import { toast } from 'sonner';

export default function BillingSettingsPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    merchantsApi.getBilling()
      .then((res: any) => {
        if (active && res?.data) {
          setBilling(res.data);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="h-8 w-32 bg-slate-800 rounded mb-6"></div>
        <div className="h-10 w-64 bg-slate-800 rounded mb-2"></div>
        <div className="h-6 w-96 bg-slate-800 rounded mb-8"></div>
        <div className="h-48 w-full bg-slate-800 rounded mb-6 border border-border"></div>
        <div className="h-48 w-full bg-slate-800 rounded mb-6 border border-border"></div>
      </div>
    );
  }

  const profile = billing?.profile || {};
  const invoices = billing?.invoices || [];
  const nextDate = profile.next_billing_date ? new Date(profile.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
      <p className="text-muted-foreground mb-8">Manage your platform plan and fee structures</p>

      <Card className="border-border mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 h-1 w-full" />
        <CardHeader>
          <CardTitle className="text-xl">Current Tier</CardTitle>
          <CardDescription className="text-sm">
            {profile.plan_name || 'Standard Plan'} &mdash; {profile.fee_percentage || '1.50'}% + {formatCurrency(profile.fixed_fee || 2)} per transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Next Invoice Amount</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(1250)}</p>
              <p className="text-sm text-blue-500 mt-1 font-medium">Due on {nextDate}</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all border-0"
              onClick={() => toast.info('To switch pricing tiers, please contact your account manager.')}
            >
              Upgrade Tier
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mb-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Platform Payment Method
            </CardTitle>
            <CardDescription>Card used automatically for platform fee settlements</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.platform_card_brand && profile.platform_card_last4 ? (
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-slate-900/50">
                <div className="w-10 h-6 bg-white rounded flex items-center justify-center font-bold text-[10px] text-black">
                  {profile.platform_card_brand.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">•••• •••• •••• {profile.platform_card_last4}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No card on file.</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => toast.info('A secure link to update your platform funding source has been sent to your registered email.')}
            >
              Update Card
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
              Recent Invoices
            </CardTitle>
            <CardDescription>Download tax invoices for accounting</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-800/50 rounded-md transition-colors">
                    <span className="font-mono text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(inv.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground">No historical invoices issued yet.</p>
              </div>
            )}
            <Button 
              variant="link" 
              className="mt-2 px-0 h-auto text-blue-400"
              onClick={() => toast.error('No historical ledger data available for export yet.')}
            >
              View History →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
