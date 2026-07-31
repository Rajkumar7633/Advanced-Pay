'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Terminal, Key, Code, Webhook, Play, Loader2, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth';
import { api } from '@/lib/api';

// Types
interface TerminalLog {
   id: string;
   timestamp: string;
   type: 'info' | 'request' | 'response' | 'error' | 'success';
   source: 'system' | 'api' | 'webhook';
   message: string;
   payload?: any;
}

export default function DeveloperStudio() {
  const [activeTab, setActiveTab] = useState('keys');
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [logs, setLogs] = useState<TerminalLog[]>([
     { id: 'boot', timestamp: new Date().toISOString(), type: 'info', source: 'system', message: 'Advanced Pay IDE Output Initialized...' }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [isFiring, setIsFiring] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Data loading
  useEffect(() => {
     fetchDeveloperData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
     if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
  }, [logs]);

  const addLog = (type: TerminalLog['type'], source: TerminalLog['source'], message: string, payload?: any) => {
     setLogs(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        type, source, message, payload
     }].slice(-50)); // Keep last 50 logs
  };

  const fetchDeveloperData = async () => {
    try {
      const [keysRes, hooksRes, eventsRes] = await Promise.all([
         api.get('/api-keys'),
         api.get('/webhooks'),
         api.get('/webhooks/events')
      ]);
      setKeys(keysRes.data || []);
      setWebhooks(hooksRes.data?.data || hooksRes.data || []);
      setWebhookEvents(eventsRes.data?.data || eventsRes.data || []);
      addLog('success', 'system', `Pulled ${keysRes.data?.length || 0} active keys and mapped backend structure.`);
    } catch {
      addLog('error', 'system', 'Failed to synchronize with HSM vault.');
    }
  };

  const handleCreateWebhook = async () => {
     if (!newWebhookUrl) return;
     try {
        addLog('request', 'api', `POST /v1/webhooks {"url": "${newWebhookUrl}"}`);
        await api.post('/webhooks', { url: newWebhookUrl, events: ['payment.succeeded', 'payment.failed'] });
        addLog('success', 'api', `200 OK: Webhook endpoint registered`);
        setNewWebhookUrl('');
        fetchDeveloperData();
     } catch {
        addLog('error', 'api', '500 Internal Server Error: Registration failed');
     }
  };

  const handleGenerateKey = async (env: 'live' | 'test') => {
    try {
      addLog('request', 'api', `POST /v1/api_keys {"environment": "${env}"}`);
      const res = await api.post('/api-keys', { environment: env });
      setKeys(prev => [res.data, ...prev]);
      toast.success('Key generated.');
      addLog('success', 'api', `200 OK: Generated ${env} keyset [${res.data.id}]`);
    } catch {
      addLog('error', 'api', '500 Internal Server Error: Generation rejected.');
    }
  };

  const fireTestWebhook = async (webhookId: string) => {
     setIsFiring(true);
     addLog('info', 'webhook', 'Warming up simulation engine towards endpoint...');
     
     try {
        addLog('request', 'webhook', `POST /api/v1/webhooks/${webhookId}/test`);
        const res = await api.post(`/webhooks/${webhookId}/test`);
        addLog('response', 'webhook', `Received Backend Dispatch Thread: HTTP 200 OK`, res.data);
        toast.success('Webhook delivery queued on Go backend.');
        setTimeout(fetchDeveloperData, 1000); // Poll for the event showing up in the DB
     } catch (e: any) {
        addLog('error', 'webhook', 'Failed to trace webhook to destination.', e?.response?.data);
     } finally {
        setIsFiring(false);
     }
  };

  const getPrimaryTestKey = () => {
      const testKey = keys.find(k => k.environment === 'test');
      return testKey?.publishable_key || 'pk_test_...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Professional Header */}
      <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Code className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Developer Studio</h1>
                <p className="text-xs text-blue-200">Enterprise API Integration Environment</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-300">API Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
         {/* LEFT PANE: WORKSPACE */}
         <div className="flex-1 overflow-y-auto p-8 flex flex-col">
           <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl text-white mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Developer Integration Hub</h2>
                    <p className="text-blue-100">Generate API keys, test webhooks, and integrate with our payment gateway using our professional SDKs.</p>
                  </div>
                  <div className="hidden md:block">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                      <Terminal className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
           </div>

           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="bg-white/10 backdrop-blur-xl border border-white/20 mb-6 p-1 justify-start rounded-xl">
                 <TabsTrigger value="keys" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg">API Keys</TabsTrigger>
                 <TabsTrigger value="code" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Integration Code</TabsTrigger>
                 <TabsTrigger value="webhooks" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Webhook Sandbox</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                  {/* TAB: KEYS */}
                  <TabsContent value="keys" className="mt-0 space-y-6">
                     <div className="flex justify-between items-center bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl">
                        <div>
                           <h3 className="font-semibold text-white text-lg">Generate API Keys</h3>
                           <p className="text-sm text-blue-200">Create secure bearer tokens for production and testing environments.</p>
                        </div>
                        <div className="flex gap-3">
                           <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => handleGenerateKey('test')}>
                             <Key className="w-4 h-4 mr-2" />
                             Test Key
                           </Button>
                           <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg" onClick={() => handleGenerateKey('live')}>
                             <Key className="w-4 h-4 mr-2" />
                             Live Key
                           </Button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {keys.filter(k => k && k.id).map((key) => (
                        <Card key={key.id} className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
                           <div className={`h-2 ${key.environment === 'live' ? 'bg-gradient-to-r from-red-500 to-pink-600' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}></div>
                           <CardContent className="p-6">
                               <div className="flex justify-between items-start mb-4">
                                  <Badge className={`${key.environment === 'live' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                                     {key.environment?.toUpperCase() || 'UNKNOWN'}
                                  </Badge>
                                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => { navigator.clipboard.writeText(key.publishable_key); toast.success('Key copied!'); }}>
                                     <Copy className="w-4 h-4" />
                                  </Button>
                               </div>
                               <div className="font-mono text-sm p-4 bg-black/30 rounded-xl border border-white/10 break-all text-blue-300">
                                  {key.publishable_key}
                               </div>
                               <div className="mt-4 flex items-center gap-2 text-xs text-blue-200">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>Active and ready for use</span>
                               </div>
                           </CardContent>
                        </Card>
                     ))}
                     </div>
                  </TabsContent>

                  {/* TAB: CODE */}
                  <TabsContent value="code" className="mt-0 space-y-6">
                      <div>
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <Code className="w-4 h-4 text-blue-400" />
                            </div>
                            1. Install SDK
                          </h3>
                          <div className="bg-black/30 backdrop-blur-xl border border-white/20 p-6 rounded-2xl font-mono text-sm text-blue-300 flex justify-between items-center group hover:border-blue-500/50 transition-colors">
                              <span className="text-lg">npm install @advancedpay/node</span>
                              <Copy className="w-5 h-5 opacity-0 group-hover:opacity-100 cursor-pointer text-white/50 hover:text-white transition-all" />
                          </div>
                      </div>

                      <div>
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                              <Play className="w-4 h-4 text-purple-400" />
                            </div>
                            2. Initialize Intent
                          </h3>
                          <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-xl">
                              <div className="bg-white/10 px-4 py-3 border-b border-white/10 flex items-center gap-2 text-xs font-mono text-white/70">
                                 <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                 <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                 <span className="ml-3 font-semibold">server.js</span>
                              </div>
                              <div className="p-6 font-mono text-sm overflow-x-auto whitespace-pre text-blue-100">
<span className="text-pink-400">import</span> { '{ AdvancedPay }' } <span className="text-pink-400">from</span> <span className="text-green-400">'@advancedpay/node'</span>;{'\n\n'}
<span className="text-white/50">// Auto-injected test key below</span>{'\n'}
<span className="text-pink-400">const</span> advancedpay = <span className="text-pink-400">new</span> AdvancedPay(<span className="text-green-400">'{getPrimaryTestKey()}'</span>);{'\n\n'}
<span className="text-pink-400">const</span> session = <span className="text-pink-400">await</span> advancedpay.checkout.create({'{'}{'\n'}
{'  '}amount: <span className="text-orange-400">5999</span>,{'\n'}
{'  '}currency: <span className="text-green-400">'usd'</span>,{'\n'}
{'  '}success_url: <span className="text-green-400">'https://your-site.com/success'</span>{'\n'}
{'}'});
                              </div>
                          </div>
                      </div>
                  </TabsContent>

                  {/* TAB: WEBHOOKS */}
                  <TabsContent value="webhooks" className="mt-0">
                      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
                          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
                          <CardHeader className="flex flex-row justify-between items-center z-10 relative border-b border-white/10">
                             <div>
                                <CardTitle className="text-white flex items-center gap-3 text-xl">
                                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                                    <Webhook className="w-5 h-5 text-indigo-400" />
                                  </div>
                                  Webhook Configuration
                                </CardTitle>
                                <CardDescription className="text-blue-200">Configure real-time HTTP endpoints for payment event notifications</CardDescription>
                             </div>
                          </CardHeader>
                          <CardContent className="space-y-6 z-10 relative pt-6">
                             <div className="flex gap-3">
                                <input 
                                   type="url" 
                                   className="flex-1 bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-sm font-mono text-emerald-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-white/30" 
                                   placeholder="https://your-server.com/api/webhooks"
                                   value={newWebhookUrl}
                                   onChange={(e) => setNewWebhookUrl(e.target.value)}
                                />
                                <Button onClick={handleCreateWebhook} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg whitespace-nowrap px-6">
                                  <Webhook className="w-4 h-4 mr-2" />
                                  Register
                                </Button>
                             </div>
                             
                             <div className="mt-6 space-y-4">
                                {webhooks.length === 0 ? (
                                   <div className="text-center font-mono text-sm text-white/50 p-12 border-2 border-dashed border-white/20 rounded-2xl bg-black/20">
                                     <Webhook className="w-12 h-12 mx-auto mb-4 text-white/30" />
                                     <p>No webhook endpoints registered</p>
                                     <p className="text-xs mt-2">Add your first endpoint above to start receiving events</p>
                                   </div>
                                ) : webhooks.map(hook => (
                                   <div key={hook.id} className="bg-black/30 backdrop-blur-xl border border-white/20 p-5 rounded-2xl flex items-center justify-between hover:border-indigo-500/50 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                                        </div>
                                        <div>
                                          <div className="font-mono text-emerald-300 text-sm mb-1">{hook.url}</div>
                                          <div className="text-xs text-white/40 font-mono tracking-widest">Secret: {hook.secret || 'Sec_HIDDEN'}</div>
                                        </div>
                                      </div>
                                      <Button disabled={isFiring} onClick={() => fireTestWebhook(hook.id)} variant="outline" className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 px-4">
                                         {isFiring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" fill="currentColor" />}
                                         Test
                                      </Button>
                                   </div>
                                ))}
                             </div>

                             {webhookEvents.length > 0 && (
                                <div className="mt-8">
                                   <h4 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                     Historical Triggers
                                   </h4>
                                   <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                      {webhookEvents.map((evt, idx) => (
                                         <div key={evt.id || idx} className="bg-black/30 backdrop-blur-xl border border-white/10 p-4 rounded-xl text-xs font-mono text-white/70 flex justify-between items-center hover:border-white/20 transition-colors">
                                            <div className="flex items-center gap-3">
                                               {evt.status === 'delivered' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Loader2 className="w-5 h-5 text-yellow-400" />}
                                               <span className="text-white/90">{evt.event_type}</span>
                                            </div>
                                            <span className="text-white/40">{new Date(evt.created_at).toLocaleTimeString()}</span>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             )}
                          </CardContent>
                      </Card>
                  </TabsContent>
              </div>
           </Tabs>
       </div>

       {/* RIGHT PANE: TERMINAL UI */}
       <div className="w-[500px] bg-black/50 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-10">
           <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-black/30">
              <span className="text-sm font-mono font-bold text-white/80 uppercase tracking-widest flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                 Live Server Trace
              </span>
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => setLogs([])}>
                 <Trash2 className="w-5 h-5" />
              </Button>
           </div>
           
           <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[12px] leading-relaxed scroll-smooth">
              {logs.map(log => (
                 <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex gap-4 text-white/40 mb-1.5 text-xs">
                       <span className="text-white/60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       <span className="uppercase text-white/30">[{log.source}]</span>
                    </div>
                    
                    <div className={`
                       ${log.type === 'error' ? 'text-red-400' : ''}
                       ${log.type === 'success' ? 'text-emerald-400' : ''}
                       ${log.type === 'request' ? 'text-blue-400' : ''}
                       ${log.type === 'response' ? 'text-yellow-400' : ''}
                       ${log.type === 'info' ? 'text-white/70' : ''}
                    `}>
                       {log.type === 'request' && <span className="mr-2 text-blue-500">{'→'}</span>}
                       {log.type === 'response' && <span className="mr-2 text-yellow-500">{'←'}</span>}
                       {log.message}
                    </div>

                    {log.payload && (
                       <pre className="mt-3 bg-black/50 backdrop-blur-xl p-4 rounded-xl border border-white/10 text-emerald-300 overflow-x-auto selection:bg-emerald-500/30 text-xs">
                          {JSON.stringify(log.payload, null, 2)}
                       </pre>
                    )}
                 </div>
              ))}
           </div>
       </div>
</div>
    </div>
  );
}
