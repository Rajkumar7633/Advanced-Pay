'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Smartphone, Building2, Globe, Wallet, Sparkles } from 'lucide-react';
import { merchantsApi } from '@/lib/api';

export default function PaymentsSettingsPage() {
  const [settings, setSettings] = useState<any>({
    payment_methods: [],
    preferences: { auto_retry_enabled: false }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res: any = await merchantsApi.getProfile();
      if (res && res.settings) {
        setSettings({
          payment_methods: res.settings.payment_methods || [],
          preferences: res.settings.preferences || { auto_retry_enabled: false }
        });
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodToggle = async (method: string, checked: boolean) => {
    const currentMethods = settings.payment_methods || [];
    const newMethods = checked 
      ? [...currentMethods, method]
      : currentMethods.filter((m: string) => m !== method);
      
    const newSettings = { ...settings, payment_methods: newMethods };
    setSettings(newSettings);
    
    try {
      await merchantsApi.updateProfile({ settings: newSettings });
    } catch (error) {
      console.error('Failed to save payment method', error);
      // Revert on failure
      setSettings(settings);
    }
  };

  const handleAutoRetryToggle = async (checked: boolean) => {
    const newSettings = { 
      ...settings, 
      preferences: { ...settings.preferences, auto_retry_enabled: checked } 
    };
    setSettings(newSettings);
    
    try {
      await merchantsApi.updateProfile({ settings: newSettings });
    } catch (error) {
      console.error('Failed to save preference', error);
      setSettings(settings); // Revert on failure
    }
  };

  const hasMethod = (method: string) => (settings.payment_methods || []).includes(method);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Your payment methods</h1>
      <p className="text-muted-foreground mb-2">
        These are <strong className="text-foreground">Advanced Pay</strong> rails only — no third-party checkout or
        wallet brand. Toggles sync to your merchant profile and control what appears in hosted / advanced checkout.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        <Link href="/dashboard/payments" className="font-medium text-primary underline-offset-4 hover:underline">
          Open payments hub
        </Link>{' '}
        for test links and cross-border flows.
      </p>

      <div className="space-y-4">
        <Card className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Cards</p>
                <p className="text-sm text-muted-foreground">Debit / credit on your gateway (your rules, your BIN routing).</p>
              </div>
            </div>
            <Switch 
              checked={hasMethod('card')} 
              onCheckedChange={(c) => handleMethodToggle('card', c)} 
            />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">UPI</p>
                <p className="text-sm text-muted-foreground">Collect, intent, QR — your UPI rail, your merchant VPA.</p>
              </div>
            </div>
            <Switch 
              checked={hasMethod('upi')} 
              onCheckedChange={(c) => handleMethodToggle('upi', c)} 
            />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Net banking</p>
                <p className="text-sm text-muted-foreground">Bank redirect flows you operate end-to-end.</p>
              </div>
            </div>
            <Switch 
              checked={hasMethod('netbanking')} 
              onCheckedChange={(c) => handleMethodToggle('netbanking', c)} 
            />
          </CardContent>
        </Card>

        <Card className="border-border border-emerald-500/20">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="font-medium">Platform wallet</p>
                <p className="text-sm text-muted-foreground">
                  Stored balance or internal wallet — Advanced Pay branded, not an external app.
                </p>
              </div>
            </div>
            <Switch
              checked={hasMethod('wallet')}
              onCheckedChange={(c) => handleMethodToggle('wallet', c)}
            />
          </CardContent>
        </Card>

        <Card className="border-border border-blue-500/20">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium">Cross-border rail</p>
                <p className="text-sm text-muted-foreground">
                  International card / wallet presentation in checkout — still your stack and settlement logic.
                </p>
              </div>
            </div>
            <Switch
              checked={hasMethod('international')}
              onCheckedChange={(c) => handleMethodToggle('international', c)}
            />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-violet-600" />
              <div>
                <p className="font-medium">Device quick-pay</p>
                <p className="text-sm text-muted-foreground">
                  One-tap using tokens you issue (optional) — no third-party wallet button required.
                </p>
              </div>
            </div>
            <Switch
              checked={hasMethod('device_quick_pay')}
              onCheckedChange={(c) => handleMethodToggle('device_quick_pay', c)}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border mt-6">
        <CardHeader>
          <CardTitle>Auto-Retry</CardTitle>
          <CardDescription>Automatically retry failed payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Enable auto-retry for failed payments</Label>
            <Switch 
              checked={settings.preferences?.auto_retry_enabled || false}
              onCheckedChange={handleAutoRetryToggle}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
