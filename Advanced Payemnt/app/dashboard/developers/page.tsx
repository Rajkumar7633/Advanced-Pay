'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Terminal, Code, Activity, Webhook, EyeOff, Eye, RefreshCw, Copy, Plus, Server, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
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

interface WebhookDeliveryEvent {
  id: string;
  event_type: string;
  transaction_id?: string;
  payload: any;
  status: string;
  attempts: number;
  created_at: string;
}

export default function DeveloperWorkstation() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookDeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  
  const { token } = useAuthStore();

  const fetchDeveloperData = async () => {
    try {
      setLoading(true);
      const [keysRes, hooksRes, eventsRes] = await Promise.all([
        api.get('/api-keys'),
        api.get('/webhooks'),
        api.get('/webhooks/events?limit=25')
      ]);
      setKeys(keysRes.data || []);
      setWebhooks(hooksRes.data?.data || hooksRes.data || []);
      setWebhookEvents(eventsRes.data?.data || eventsRes.data || []);
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

  const handleRetryWebhook = async (id: string) => {
    try {
      await api.post(`/webhooks/events/${id}/retry`);
      toast.success('Event re-queued for delivery loop.');
      fetchDeveloperData();
    } catch {
      toast.error('Failed to trigger retry');
    }
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

      {/* REAL-TIME DELIVERY LOGS */}
      <div className="mt-8">
        <Card className="border-border/60 shadow-xl overflow-hidden bg-slate-950 text-slate-300">
           <CardHeader className="border-b border-white/5 bg-slate-900/50 flex flex-row items-center justify-between pb-4">
               <div>
                   <CardTitle className="text-xl text-white flex items-center gap-2"><Server className="w-5 h-5 text-green-400" /> Webhook Delivery Simulator</CardTitle>
                   <CardDescription className="text-slate-400">Real-time asynchronous payload trace logs. Click to inspect JSON payloads.</CardDescription>
               </div>
               <Button onClick={fetchDeveloperData} variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"><RefreshCw className="w-4 h-4 mr-2"/> Refresh Engine</Button>
           </CardHeader>
           <CardContent className="p-0">
               {webhookEvents.length === 0 ? (
                   <div className="p-12 text-center text-slate-500 font-mono text-sm">
                       No webhook dispatches captured yet. Trigger an API test.
                   </div>
               ) : (
                   <div className="divide-y divide-white/5">
                       {webhookEvents.map(event => (
                           <div key={event.id} className="flex flex-col group">
                               {/* Row Header */}
                               <div 
                                 className="flex items-center justify-between p-4 hover:bg-slate-900/80 cursor-pointer transition-colors"
                                 onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                               >
                                   <div className="flex items-center gap-4 w-1/3">
                                       {event.status === 'delivered' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : event.status === 'failed' ? <XCircle className="w-5 h-5 text-red-500" /> : <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />}
                                       <span className="font-mono text-sm text-slate-200">{event.event_type}</span>
                                   </div>
                                   <div className="w-1/3 text-center">
                                       <Badge variant="outline" className={`bg-transparent font-mono text-[10px] ${event.status === 'delivered' ? 'text-green-400 border-green-400/30' : event.status === 'failed' ? 'text-red-400 border-red-400/30' : 'text-yellow-400 border-yellow-400/30'}`}>
                                           {event.status.toUpperCase()}
                                       </Badge>
                                   </div>
                                   <div className="w-1/3 text-right text-xs font-mono text-slate-500 flex justify-end items-center gap-4">
                                       {new Date(event.created_at).toLocaleString()}
                                       <Code className="w-4 h-4" />
                                   </div>
                               </div>

                               {/* Expanded JSON Inspector */}
                               {expandedEvent === event.id && (
                                   <div className="bg-[#0c1017] p-6 border-t border-white/5 relative shadow-inner">
                                       <div className="absolute top-4 right-4 flex items-center gap-2">
                                           <Button size="sm" variant="outline" className="h-8 bg-slate-900 border-slate-700 text-slate-300 hover:text-white" onClick={() => handleCopy(JSON.stringify(event.payload, null, 2))}>
                                              <Copy className="w-3.5 h-3.5 mr-2" /> Copy Payload
                                           </Button>
                                           <Button size="sm" onClick={() => handleRetryWebhook(event.id)} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                                              <RotateCcw className="w-3.5 h-3.5 mr-2" /> Retry Delivery
                                           </Button>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 gap-8 w-[calc(100%-250px)]">
                                          <div>
                                              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-bold">Event Trajectory</p>
                                              <div className="space-y-1 font-mono text-xs text-slate-400">
                                                  <p>ID: <span className="text-blue-400">{event.id}</span></p>
                                                  <p>Attempts: <span className="text-orange-400">{event.attempts}</span> / 5</p>
                                                  {event.transaction_id && <p>Transaction Bound: <span className="text-purple-400">{event.transaction_id}</span></p>}
                                              </div>
                                          </div>
                                       </div>
                                       
                                       <div className="mt-4">
                                          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-bold">Raw JSON Payload</p>
                                          <div className="bg-[#05070a] border border-white/5 rounded-xl p-4 overflow-x-auto">
                                              <pre className="text-[11px] font-mono leading-relaxed text-emerald-400">
                                                  {JSON.stringify(event.payload, null, 2)}
                                              </pre>
                                          </div>
                                       </div>
                                   </div>
                               )}
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
