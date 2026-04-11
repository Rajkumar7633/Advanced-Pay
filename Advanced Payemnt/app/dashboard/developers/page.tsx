'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Terminal, Code, Activity, Webhook, EyeOff, Eye, RefreshCw, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth';
import { api } from '@/lib/api';

interface ApiKey {
  id: string;
  environment: string;
  publishable_key: string;
  secret_key?: string; // Only strictly returns from backend on genesis creation
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
}

export default function DeveloperWorkstation() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  
  const { token } = useAuthStore();

  const fetchDeveloperData = async () => {
    try {
      setLoading(true);
      const [keysRes, hooksRes] = await Promise.all([
        api.get('/api-keys'),
        api.get('/webhooks')
      ]);
      setKeys(keysRes.data || []);
      setWebhooks(hooksRes.data || []);
    } catch (e) {
      toast.error('Failed to load SDK resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeveloperData();
  }, []);

  const handleGenerateKey = async (env: 'live' | 'test') => {
    try {
      const res = await api.post('/api-keys', { environment: env });
      toast.success(`Platform API ${env} key generated. Save the secret immediately!`);
      // Update keys with the new key (which contains the temporary raw secret)
      setKeys(prev => [res.data.data, ...prev]);
      setShowSecret(prev => ({ ...prev, [res.data.data.id]: true }));
    } catch {
      toast.error('Key generation failure');
    }
  };

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('SDK Key Copied internally');
  };

  const toggleSecret = (id: string) => {
    setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
     return <div className="p-8 text-muted-foreground animate-pulse font-mono flex items-center gap-2"><Key className="w-4 h-4"/> Initiating Development Engine...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Overview Engine Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 p-8 rounded-3xl border border-blue-500/10">
        <div>
          <h1 className="text-4xl justify-center items-center flex gap-3 font-black text-foreground tracking-tight">
             <Terminal className="w-10 h-10 text-blue-500" /> API Workstation
          </h1>
          <p className="text-muted-foreground mt-3 font-mono">
            Integrate Advanced Pay natively. Manage SDK keys and configure real-time asynchronous Webhooks.
          </p>
        </div>
        <div className="flex bg-background/50 p-2 rounded-xl border border-border/50 gap-2">
            <Button variant="default" onClick={() => handleGenerateKey('test')} className="bg-slate-800 hover:bg-slate-700">
               Generate Test Key
            </Button>
            <Button variant="default" onClick={() => handleGenerateKey('live')} className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20">
               Generate Live Key
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* API KEYS MATRIX */}
        <Card className="border-border/60 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Key className="w-32 h-32"/></div>
           <CardHeader>
               <CardTitle className="flex items-center gap-2 text-xl"><Code className="w-5 h-5 text-blue-500" /> Platform SDK Keys</CardTitle>
               <CardDescription>Authentication parameters determining environment execution.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4 z-10 relative">
               {keys.length === 0 ? (
                   <div className="p-8 text-center text-muted-foreground font-mono text-sm border-2 border-dashed border-border/50 rounded-xl">
                       No Active Root Keys
                   </div>
               ) : (
                   keys.map(key => (
                       <div key={key.id} className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
                           <div className="flex justify-between items-center">
                               <Badge variant={key.environment === 'live' ? 'default' : 'secondary'} 
                                      className={key.environment === 'live' ? 'bg-blue-600' : ''}>
                                   {key.environment.toUpperCase()}
                               </Badge>
                               <span className="text-xs text-muted-foreground font-mono">{new Date(key.created_at).toLocaleDateString()}</span>
                           </div>
                           
                           <div>
                               <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Publishable Key</p>
                               <div className="flex items-center gap-2">
                                   <code className="flex-1 bg-muted/40 p-2 rounded-lg text-xs break-all">{key.publishable_key}</code>
                                   <Button size="icon" variant="ghost" onClick={() => handleCopy(key.publishable_key)}><Copy className="w-4 h-4 text-muted-foreground" /></Button>
                               </div>
                           </div>

                           <div>
                               <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Secret Bound Trace</p>
                               <div className="flex items-center gap-2">
                                   <code className="flex-1 bg-muted/40 p-2 rounded-lg text-xs break-all text-blue-400">
                                       {key.secret_key ? (showSecret[key.id] ? key.secret_key : 'sk_' + key.environment + '_•••••••••••••••••••••••••') 
                                                       : 'sk_' + key.environment + '_•••••••••••••••••••••••••'}
                                   </code>
                                   {key.secret_key && (
                                       <Button size="icon" variant="ghost" onClick={() => toggleSecret(key.id)}>
                                           {showSecret[key.id] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                                       </Button>
                                   )}
                                   <Button size="icon" variant="ghost" onClick={() => handleCopy(key.secret_key)} disabled={!key.secret_key}><Copy className="w-4 h-4 text-muted-foreground" /></Button>
                               </div>
                               {key.secret_key && <p className="text-[10px] text-amber-500 mt-2 font-mono">WARNING: Secret is only visible immediately after generation!</p>}
                           </div>
                       </div>
                   ))
               )}
           </CardContent>
        </Card>

        {/* WEBHOOK LISTENERS */}
        <Card className="border-border/60 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Webhook className="w-32 h-32"/></div>
           <CardHeader className="flex flex-row justify-between items-start">
               <div>
                   <CardTitle className="flex items-center gap-2 text-xl"><Activity className="w-5 h-5 text-indigo-500" /> Webhook Integrations</CardTitle>
                   <CardDescription>Event-driven push alerts for back-end synchronizations.</CardDescription>
               </div>
               <Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add Endpoint</Button>
           </CardHeader>
           <CardContent className="space-y-4 z-10 relative">
               {webhooks.length === 0 ? (
                   <div className="p-8 text-center text-muted-foreground font-mono text-sm border-2 border-dashed border-border/50 rounded-xl">
                       No Endpoints Registered
                   </div>
               ) : (
                   webhooks.map(hook => (
                       <div key={hook.id} className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3 group transition-all hover:bg-muted/10">
                           <div className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${hook.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                 <span className="font-mono text-sm truncate max-w-[200px]">{hook.url}</span>
                               </div>
                               <Button variant="ghost" size="sm" className="h-7 text-xs">Test Ping</Button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                               {hook.events.map(ev => (
                                   <Badge key={ev} variant="outline" className="bg-background text-[10px] uppercase font-mono">{ev}</Badge>
                               ))}
                           </div>
                       </div>
                   ))
               )}
           </CardContent>
        </Card>

      </div>
    </div>
  );
}
