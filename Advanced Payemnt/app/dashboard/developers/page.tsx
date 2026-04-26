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
    <div className="flex h-full bg-[#0A0A0A] overflow-hidden text-slate-300">
       
       {/* LEFT PANE: WORKSPACE */}
       <div className="flex-1 overflow-y-auto border-r border-slate-800 p-8 flex flex-col">
           <div className="mb-6 flex justify-between items-end">
              <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                     <Terminal className="w-8 h-8 text-blue-500" /> Developer IDE
                  </h1>
                  <p className="text-slate-500 mt-2 text-sm">A complete live-testing environment for your integration.</p>
              </div>
           </div>

           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="bg-[#111111] border border-slate-800 mb-6 p-1 justify-start">
                 <TabsTrigger value="keys" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">API Keys</TabsTrigger>
                 <TabsTrigger value="code" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Integration Code</TabsTrigger>
                 <TabsTrigger value="webhooks" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Webhook Sandbox</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                  {/* TAB: KEYS */}
                  <TabsContent value="keys" className="mt-0 space-y-4">
                     <div className="flex justify-between items-center bg-[#111111] p-4 rounded-lg border border-slate-800">
                        <div>
                           <h3 className="font-semibold text-white">Generate Authenticator</h3>
                           <p className="text-xs text-slate-500">Create new bearer tokens for your stack.</p>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" className="border-slate-700 bg-transparent" onClick={() => handleGenerateKey('test')}>New Test Key</Button>
                           <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleGenerateKey('live')}>New Live Key</Button>
                        </div>
                     </div>

                     {keys.filter(k => k && k.id).map((key) => (
                        <Card key={key.id} className="bg-[#111111] border-slate-800">
                           <CardContent className="p-4 flex justify-between items-center">
                               <div>
                                  <Badge variant="outline" className={key.environment === 'live' ? 'text-red-400 border-red-500/50' : 'text-emerald-400 border-emerald-500/50'}>
                                     {key.environment?.toUpperCase() || 'UNKNOWN'}
                                  </Badge>
                                  <div className="mt-2 font-mono text-xs p-2 bg-black rounded border border-slate-800 break-all w-[300px]">
                                     {key.publishable_key}
                                  </div>
                               </div>
                               <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(key.publishable_key); toast.success('Key copied!'); }}>
                                  <Copy className="w-4 h-4 text-slate-500" />
                               </Button>
                           </CardContent>
                        </Card>
                     ))}
                  </TabsContent>

                  {/* TAB: CODE */}
                  <TabsContent value="code" className="mt-0 space-y-6">
                      <div>
                          <h3 className="text-lg font-semibold text-white mb-2 font-mono">1. Install SDK</h3>
                          <div className="bg-[#050505] border border-slate-800 p-4 rounded-lg font-mono text-sm text-blue-400 flex justify-between items-center group">
                              <span>npm install @advancedpay/node</span>
                              <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-500" />
                          </div>
                      </div>

                      <div>
                          <h3 className="text-lg font-semibold text-white mb-2 font-mono">2. Initialize Intent</h3>
                          <div className="bg-[#050505] border border-slate-800 rounded-lg overflow-hidden">
                              <div className="bg-[#111] px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-400">
                                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                 <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                 <span className="ml-2">server.js</span>
                              </div>
                              <div className="p-4 font-mono text-sm overflow-x-auto whitespace-pre">
<span className="text-pink-500">import</span> { '{ AdvancedPay }' } <span className="text-pink-500">from</span> <span className="text-green-400">'@advancedpay/node'</span>;{'\n\n'}
<span className="text-slate-500">// Auto-injected test key below</span>{'\n'}
<span className="text-pink-500">const</span> advancedpay = <span className="text-pink-500">new</span> AdvancedPay(<span className="text-green-400">'{getPrimaryTestKey()}'</span>);{'\n\n'}
<span className="text-pink-500">const</span> session = <span className="text-pink-500">await</span> advancedpay.checkout.create({'{'}{'\n'}
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
                      <Card className="bg-transparent border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.05)] relative overflow-hidden">
                          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
                          <CardHeader className="flex flex-row justify-between items-center z-10 relative">
                             <div>
                                <CardTitle className="text-indigo-400 flex items-center gap-2"><Webhook className="w-5 h-5"/> Live API Configuration</CardTitle>
                                <CardDescription className="text-slate-500">Configure real HTTP destinations synced strictly to the Go SQL Backend.</CardDescription>
                             </div>
                          </CardHeader>
                          <CardContent className="space-y-6 z-10 relative border-t border-slate-800/50 pt-6">
                             <div className="flex gap-2">
                                <input 
                                   type="url" 
                                   className="flex-1 bg-[#050505] border border-slate-800 rounded p-3 text-sm font-mono text-emerald-400 outline-none focus:border-indigo-500" 
                                   placeholder="https://your-server.com/api/webhooks"
                                   value={newWebhookUrl}
                                   onChange={(e) => setNewWebhookUrl(e.target.value)}
                                />
                                <Button onClick={handleCreateWebhook} className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">Register Endpoint</Button>
                             </div>
                             
                             <div className="mt-6 space-y-4">
                                {webhooks.length === 0 ? (
                                   <div className="text-center font-mono text-sm text-slate-500 p-8 border border-slate-800 border-dashed rounded bg-[#0a0a0a]">No endpoints strictly registered.</div>
                                ) : webhooks.map(hook => (
                                   <div key={hook.id} className="bg-[#111111] border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                                      <div>
                                         <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="font-mono text-emerald-400">{hook.url}</span>
                                         </div>
                                         <div className="text-xs text-slate-500 font-mono tracking-widest">{hook.secret || 'Sec_HIDDEN'}</div>
                                      </div>
                                      <Button disabled={isFiring} onClick={() => fireTestWebhook(hook.id)} variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300">
                                         {isFiring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" fill="currentColor" />}
                                         Fire Backend Trace
                                      </Button>
                                   </div>
                                ))}
                             </div>

                             {webhookEvents.length > 0 && (
                                <div className="mt-8">
                                   <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Historical Triggers</h4>
                                   <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                      {webhookEvents.map((evt, idx) => (
                                         <div key={evt.id || idx} className="bg-[#050505] border border-slate-800 p-3 rounded text-xs font-mono text-slate-300 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                               {evt.status === 'delivered' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Loader2 className="w-4 h-4 text-yellow-500" />}
                                               <span>{evt.event_type}</span>
                                            </div>
                                            <span className="text-slate-600">{new Date(evt.created_at).toLocaleTimeString()}</span>
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
       <div className="w-[450px] bg-[#050505] border-l border-slate-800 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-10">
           <div className="h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-[#0a0a0a]">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Server Trace
              </span>
              <Button variant="ghost" size="icon" onClick={() => setLogs([])}>
                 <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400" />
              </Button>
           </div>
           
           <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px] leading-relaxed scroll-smooth">
              {logs.map(log => (
                 <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex gap-3 text-slate-600 mb-1">
                       <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                       <span className="uppercase text-slate-500">[{log.source}]</span>
                    </div>
                    
                    <div className={`
                       ${log.type === 'error' ? 'text-red-400' : ''}
                       ${log.type === 'success' ? 'text-emerald-400' : ''}
                       ${log.type === 'request' ? 'text-blue-400' : ''}
                       ${log.type === 'response' ? 'text-yellow-400' : ''}
                       ${log.type === 'info' ? 'text-slate-300' : ''}
                    `}>
                       {log.type === 'request' && <span className="mr-2">{'->'}</span>}
                       {log.type === 'response' && <span className="mr-2">{'<-'}</span>}
                       {log.message}
                    </div>

                    {log.payload && (
                       <pre className="mt-2 bg-[#111111] p-3 rounded border border-slate-800 text-green-400 overflow-x-auto selection:bg-green-500/30">
                          {JSON.stringify(log.payload, null, 2)}
                       </pre>
                    )}
                 </div>
              ))}
           </div>
       </div>

    </div>
  );
}
