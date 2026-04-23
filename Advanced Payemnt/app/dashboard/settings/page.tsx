'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Lock, Bell, Eye, EyeOff, Copy, RefreshCw, Link2, Trash2, Plus } from 'lucide-react';
import { merchantsApi, authApi, webhooksApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

export default function SettingsPage() {
  const [showSecrets, setShowSecrets] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { user } = useAuthStore();

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');

  // 2FA states
  const [otpUrl, setOtpUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const prof = await merchantsApi.getProfile();
        if (!cancelled) {
          setProfile(prof?.data);
          if (prof?.data?.description) {
            setBusinessDescription(prof.data.description);
          }
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [keysRes, hooksRes] = await Promise.all([
          merchantsApi.getApiKeys(),
          webhooksApi.list()
        ]);
        if (!cancelled) {
          setApiKeys((keysRes as any)?.data || []);
          setWebhooks((hooksRes as any)?.data || []);
        }
      } catch (e) {
        console.error('Failed to load api keys/webhooks:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!profile?.business_name || !profile?.email) {
      alert('Please fill in all required fields');
      return;
    }

    setSaveLoading(true);
    try {
      const res = await merchantsApi.updateProfile({
        business_name: profile?.business_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        description: businessDescription || null,
      });
      setProfile(res?.data);
      alert('Profile updated successfully');
    } catch (e) {
      console.error('Update error', e);
      alert('Failed to update profile: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      await merchantsApi.updatePassword({ current_password: currentPassword, new_password: newPassword });
      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.error('Password update error', e);
      alert('Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const res: any = await merchantsApi.createApiKey({ name: `API Key ${new Date().toLocaleDateString()}`, permissions: [] });
      setApiKeys([res.data, ...apiKeys]);
      alert('New API key generated successfully!');
    } catch (e) {
      console.error('Generate key error', e);
      alert('Failed to generate API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await merchantsApi.revokeApiKey(keyId);
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      alert('API key revoked successfully!');
    } catch (e) {
      console.error('Revoke key error', e);
      alert('Failed to revoke API key');
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl) return alert('URL required');
    try {
      const res: any = await webhooksApi.create(webhookUrl, ['payment.success', 'payment.failed']);
      setWebhooks([res.data, ...webhooks]);
      setWebhookUrl('');
      alert('Webhook created!');
    } catch (e) {
      alert('Failed to create webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete Webhook?')) return;
    try {
      await webhooksApi.delete(id);
      setWebhooks(webhooks.filter(w => w.id !== id));
    } catch {
      alert('Failed to delete webhook');
    }
  };

  const maskKey = (key: string) => {
    const start = key.substring(0, 4);
    const end = key.substring(key.length - 4);
    return `${start}${'•'.repeat(16)}${end}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account and API configurations</p>
          </div>

          <Link
            href="/dashboard/payments"
            className="mb-6 block rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm transition-colors hover:bg-primary/10"
          >
            <span className="font-semibold text-foreground">Payments hub</span>
            <span className="text-muted-foreground">
              {' '}
              — your UPI, cards, wallet, and cross-border rails; checkout links in one place →
            </span>
          </Link>

          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <Link href="/dashboard/settings/account" className="block">
              <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Account</CardTitle>
                  <CardDescription>Business info, KYC, tax details</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/settings/api" className="block">
              <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>Manage API keys and webhooks</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/settings/payments" className="block">
              <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Payment Methods</CardTitle>
                  <CardDescription>Enable/disable payment methods</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/branding" className="block">
              <Card className="border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base text-indigo-500 flex items-center gap-2">Theme Engine</CardTitle>
                  <CardDescription>White-label your hosted checkout</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/settings/team" className="block">
              <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Team</CardTitle>
                  <CardDescription>Team members and permissions</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/settings/billing" className="block">
              <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">Billing</CardTitle>
                  <CardDescription>Plan and payment method</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
              <TabsTrigger value="account">Quick: Account</TabsTrigger>
              <TabsTrigger value="api-keys">Quick: API Keys</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Update your business details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Business Name *
                      </label>
                      <Input
                        value={profile?.business_name || ''}
                        onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                        className="bg-card border-border"
                        placeholder="Enter your business name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Email *
                      </label>
                      <Input
                        value={profile?.email || ''}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        type="email"
                        className="bg-card border-border"
                        placeholder="business@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Phone
                    </label>
                    <Input
                      value={profile?.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="bg-card border-border"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Business Description
                    </label>
                    <textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground"
                      rows={4}
                      placeholder="Describe your business and what you sell..."
                    />
                  </div>

                  <Button 
                    className="bg-primary hover:bg-primary/90" 
                    onClick={handleSaveProfile} 
                    disabled={saveLoading || isLoading}
                  >
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>API Keys</CardTitle>
                      <CardDescription>Manage your API credentials</CardDescription>
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleGenerateApiKey}>
                      Generate New Key
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No API keys generated yet</p>
                      <p className="text-sm mt-2">Click "Generate New Key" to create your first API key</p>
                    </div>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="p-4 border border-border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{key.name}</p>
                            <p className="text-xs text-muted-foreground">Created: {new Date(key.created).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            key.mode === 'live' 
                              ? 'bg-green-500/10 text-green-600' 
                              : 'bg-yellow-500/10 text-yellow-600'
                          }`}>
                            {key.mode === 'live' ? 'Live' : 'Test'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-800/50 p-3 rounded">
                          <code className="flex-1 text-sm font-mono text-foreground">
                            {showSecrets ? key.key : maskKey(key.key)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowSecrets(!showSecrets)}
                          >
                            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigator.clipboard.writeText(key.key)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            alert('Key regeneration functionality will be available soon!');
                          }}>
                            Regenerate
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRevokeKey(key.id)}>
                            Revoke
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Webhooks Section */}
              <Card className="border-border mt-6">
                <CardHeader>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>Listen to real-time events on your server</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Input 
                      placeholder="https://your-domain.com/webhook" 
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="bg-card border-border flex-1"
                    />
                    <Button onClick={handleCreateWebhook} className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Endpoint
                    </Button>
                  </div>

                  {webhooks.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border border-border border-dashed rounded-lg">
                      <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No webhook endpoints configured</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {webhooks.map((wh) => (
                        <div key={wh.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border rounded-lg bg-card gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground truncate">{wh.url}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${wh.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                {wh.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {wh.events?.map((ev: string) => (
                                <span key={ev} className="text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                                  {ev}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Secret: <code className="font-mono text-foreground px-1 py-0.5 bg-slate-800/50 rounded">{wh.secret || '••••••••'}</code>
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-white hover:bg-destructive shadow-sm self-start sm:self-center" onClick={() => handleDeleteWebhook(wh.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {apiKeys.length > 0 && (
                <Card className="border-yellow-500/50 bg-yellow-500/5 mt-6">
                  <CardHeader>
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <CardTitle className="text-yellow-600">Keep Your Keys Safe</CardTitle>
                        <CardDescription>Never share your API keys in code or version control. Store your Webhook secrets securely.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Current Password
                    </label>
                    <Input 
                      type="password" 
                      className="bg-card border-border"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      New Password
                    </label>
                    <Input 
                      type="password" 
                      className="bg-card border-border"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Confirm Password
                    </label>
                    <Input 
                      type="password" 
                      className="bg-card border-border"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button 
                    className="bg-primary hover:bg-primary/90" 
                    onClick={handleUpdatePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile?.two_factor_enabled ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">
                        2FA is strictly enabled and securing your logins.
                      </p>
                      <Button variant="outline" className="text-destructive" onClick={async () => {
                        if (confirm('Are you sure you want to disable 2FA? This greatly reduces account safety.')) {
                          try {
                            await authApi.disable2FA();
                            setProfile({...profile, two_factor_enabled: false});
                            alert('2FA disabled successfully.');
                          } catch(e) {
                            alert('Error wiping 2FA configurations.');
                          }
                        }
                      }}>
                        Disable 2FA
                      </Button>
                    </div>
                  ) : (
                    <div>
                       {otpUrl ? (
                         <div className="space-y-4 text-center">
                           <p className="text-sm font-medium">Scan this code using Google Authenticator, Authy, or any TOTP app:</p>
                           <img 
                             src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(otpUrl)}`} 
                             alt="2FA QR Code" 
                             className="mx-auto rounded-lg"
                           />
                           <Input 
                             type="text" 
                             placeholder="Enter 6-digit code"
                             maxLength={6}
                             value={verifyCode}
                             className="max-w-[200px] mx-auto text-center tracking-widest bg-card border-border"
                             onChange={(e) => setVerifyCode(e.target.value)}
                           />
                           <div className="flex justify-center gap-3">
                             <Button onClick={async () => {
                               try {
                                 await authApi.verify2FA(verifyCode);
                                 setProfile({...profile, two_factor_enabled: true});
                                 setOtpUrl('');
                                 alert('2FA Setup Perfect!');
                               } catch(e) {
                                 alert('Incorrect code, please retry.');
                               }
                             }}>Verify & Enable</Button>
                             <Button variant="ghost" onClick={() => setOtpUrl('')}>Cancel</Button>
                           </div>
                         </div>
                       ) : (
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Enable 2FA to protect your account with an additional security step during login.
                          </p>
                          <Button variant="outline" onClick={async () => {
                            try {
                              const res: any = await authApi.generate2FA();
                              setOtpUrl(res.qr_url);
                            } catch(e) {
                              alert('Error generating internal 2FA tokens.');
                            }
                          }}>
                            Start 2FA Setup
                          </Button>
                        </div>
                       )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage your active login sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 border border-border rounded-lg">
                    <p className="font-medium text-foreground text-sm">Current Session</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active now • {user?.email || 'Unknown'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={async () => {
                    if (confirm('Are you sure you want to logout all other sessions? This will immediately terminate keys across all devices.')) {
                      try {
                        await authApi.logoutAll();
                        alert('All other sessions logged out successfully!');
                      } catch(e) {
                        alert('Could not drop all sessions immediately.');
                      }
                    }
                  }}>
                    Logout All Other Sessions
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </div>
  );
}
