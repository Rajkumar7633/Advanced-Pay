'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Copy, Eye, EyeOff, RefreshCw, Plus, Shield, AlertCircle } from 'lucide-react';
import { merchantsApi } from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  mode: 'live' | 'test';
  created: string;
  last_used?: string;
  usage_count?: number;
  permissions: string[];
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await merchantsApi.getApiKeys();
      if (res?.data) {
        setApiKeys(res.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const newKey = {
        name: `API Key ${new Date().toLocaleDateString()}`,
        permissions: ['read', 'write']
      };
      
      const res = await merchantsApi.createApiKey(newKey);
      if (res?.data) {
        setApiKeys([res.data, ...apiKeys]);
        alert('API key generated successfully!');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will be immediately revoked.')) {
      return;
    }

    try {
      const res = await merchantsApi.regenerateApiKey(keyId);
      if (res?.data) {
        setApiKeys(apiKeys.map(key => key.id === keyId ? res.data : key));
        alert('API key regenerated successfully!');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate API key');
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
      setError(e instanceof Error ? e.message : 'Failed to revoke API key');
    }
  };

  const maskKey = (key: string) => {
    const start = key.substring(0, 4);
    const end = key.substring(key.length - 4);
    return `${start}${'•'.repeat(16)}${end}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const toggleSecret = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground">Manage your API credentials and access tokens</p>
        </div>
        <Link href="/dashboard/settings" className="text-primary hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Generate New Key
                </CardTitle>
                <CardDescription>Create new API keys for your applications</CardDescription>
              </div>
              <Button 
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90"
              >
                {isGenerating ? 'Generating...' : 'Generate Key'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Key Permissions</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Read Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Write Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Settlement Access</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active API Keys</CardTitle>
            <CardDescription>Manage and monitor your existing API keys</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No API keys generated yet</p>
                <p className="text-sm mt-2">Click "Generate New Key" to create your first API key</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
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
                        {showSecrets[key.id] ? key.key : maskKey(key.key)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleSecret(key.id)}
                      >
                        {showSecrets[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(key.key)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRegenerateKey(key.id)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRevokeKey(key.id)}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
