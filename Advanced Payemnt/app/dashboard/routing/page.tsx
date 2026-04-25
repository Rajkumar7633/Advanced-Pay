'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Activity, Globe, Zap, ArrowRight, Server, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeData {
  id: string;
  type: 'trigger' | 'condition' | 'gateway' | 'failover';
  title: string;
  description: string;
  status: 'active' | 'warning' | 'offline';
  x: number;
  y: number;
  rules?: string[];
}

const INITIAL_NODES: NodeData[] = [
  { id: 'n1', type: 'trigger', title: 'Global Checkout', description: 'Incoming API Requests', status: 'active', x: 50, y: 300, rules: ['All traffic', 'Validate API Key'] },
  { id: 'n2', type: 'condition', title: 'Risk Engine', description: 'Fraud Radar Scan', status: 'active', x: 250, y: 300, rules: ['Drop if IP Blocked', 'Require 3DS if amount > $5000'] },
  { id: 'n3', type: 'condition', title: 'Smart Router', description: 'Evaluate Currency/Volume', status: 'active', x: 450, y: 300, rules: ['If USD/EUR -> Node 4', 'If INR -> Node 5', 'Fallback -> Node 6'] },
  { id: 'n4', type: 'gateway', title: 'Primary Gateway (Stripe)', description: 'USD/EUR High Volume', status: 'active', x: 750, y: 200, rules: ['Endpoint: api.stripe.com', 'Timeout: 2000ms'] },
  { id: 'n5', type: 'gateway', title: 'Asia Gateway (Razorpay)', description: 'INR Special Routing', status: 'active', x: 750, y: 400, rules: ['Endpoint: api.razorpay.com', 'Feature: Native UPI'] },
  { id: 'n6', type: 'failover', title: 'Backup Gateway (Adyen)', description: 'Auto-Failover Node', status: 'offline', x: 1000, y: 200, rules: ['Active only if Node 4 is OFFLINE', 'Route via Amsterdam DC'] },
];

export default function SmartRoutingPage() {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [activeTraffic, setActiveTraffic] = useState(false);
  const [simulatedTps, setSimulatedTps] = useState(8490);
  const [activeNode, setActiveNode] = useState<NodeData | null>(null);

  // Simulate TPS fluctuations
  useEffect(() => {
    if (!activeTraffic) return;
    const interval = setInterval(() => {
      setSimulatedTps((prev) => {
         const fluctuate = Math.floor(Math.random() * 500) - 250;
         return Math.max(100, Math.min(prev + fluctuate, 15000));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTraffic]);

  const simulateFailure = () => {
    setNodes(prev => prev.map(n => {
       if (n.id === 'n4') return { ...n, status: 'offline', title: 'Primary Gateway (OFFLINE)' };
       if (n.id === 'n6') return { ...n, status: 'active', title: 'Backup Gateway (Acquiring Traffic)' };
       return n;
    }));
  };

  const resetState = () => {
    setNodes(INITIAL_NODES);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0D14] overflow-hidden p-6 gap-6 relative text-slate-200">
       
       <div className="flex justify-between items-center mb-2">
         <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Network className="w-8 h-8 text-blue-500" />
              Hyperscale Smart Routing
            </h1>
            <p className="text-slate-400 mt-1">Configure global latency logic and automatic failover gateways.</p>
         </div>
         <div className="flex gap-4">
            <Button 
               variant="outline" 
               className="border-red-500/50 text-red-400 hover:bg-red-500/10"
               onClick={simulateFailure}
            >
               <ShieldAlert className="w-4 h-4 mr-2" />
               Simulate Outage (Primary Down)
            </Button>
            <Button 
               onClick={() => setActiveTraffic(!activeTraffic)}
               className={cn(
                 "transition-colors shadow-lg",
                 activeTraffic ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
               )}
            >
               <Activity className="w-4 h-4 mr-2" />
               {activeTraffic ? "Halt Telemetry" : "Engage Global Telemetry"}
            </Button>
            <Button variant="ghost" onClick={resetState}>Reset Layout</Button>
         </div>
       </div>

       <div className="flex flex-1 gap-6 min-h-0">
          
          {/* Telemetry Sidebar */}
          <Card className="w-80 bg-[#111622] border-slate-800 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-slate-800 bg-[#0e121b]">
                <h3 className="font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider text-xs">
                   <Globe className="w-4 h-4 text-emerald-500" />
                   Network Status
                </h3>
             </div>
             
             <div className="p-6 flex-1 flex flex-col gap-8">
                <div>
                   <p className="text-sm font-medium text-slate-500 mb-1 tracking-wider uppercase">Live Transactions</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white tabular-nums tracking-tighter">
                         {activeTraffic ? simulatedTps.toLocaleString() : '---'}
                      </span>
                      <span className="text-sm text-slate-400 font-mono">/sec</span>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-sm font-medium text-slate-500 tracking-wider uppercase border-b border-slate-800 pb-2">Active Regions</p>
                   {['North America (US-East)', 'Europe (EU-Central)', 'Asia Pacific (AP-South)'].map((region, i) => (
                      <div key={region} className="flex items-center justify-between">
                         <span className="text-sm text-slate-300">{region}</span>
                         <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                      </div>
                   ))}
                </div>

                <div className="mt-auto space-y-4 border-t border-slate-800 pt-6">
                   <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 border-l-4 border-l-blue-500">
                      <h4 className="text-sm font-semibold text-white mb-1">Global Routing Mode</h4>
                      <p className="text-xs text-slate-400">Dynamic Multi-Acquirer setup is currently routing transactions identically across 4 availability zones.</p>
                   </div>
                </div>
             </div>
          </Card>

          {/* Interactive Flow Canvas */}
          <div className="flex-1 rounded-xl border border-slate-800 bg-[#0A0D14] relative overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[length:40px_40px] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
              
              {/* SVG Connectors Base Box */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                 <defs>
                    <linearGradient id="activeLine" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor="#3b82f6" />
                       <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="warningLine" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor="#ef4444" />
                       <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <filter id="glow">
                       <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                       <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                       </feMerge>
                    </filter>
                 </defs>

                 {/* Connection Paths */}
                 {/* Trigger to Risk */}
                 <path d="M 200 340 L 250 340" stroke="url(#activeLine)" strokeWidth="3" fill="none" opacity={0.6} />
                 
                 {/* Risk to Smart Router */}
                 <path d="M 400 340 L 450 340" stroke="url(#activeLine)" strokeWidth="3" fill="none" opacity={0.6} />
                 
                 {/* Smart Router to Gateways */}
                 {/* To Primary */}
                 <path d="M 600 340 C 675 340, 675 250, 750 250" 
                    stroke={nodes.find(n => n.id === 'n4')?.status === 'offline' ? 'url(#warningLine)' : 'url(#activeLine)'} 
                    strokeWidth="3" fill="none" opacity={0.6} 
                 />
                 
                 {/* To Asia */}
                 <path d="M 600 340 C 675 340, 675 450, 750 450" stroke="url(#activeLine)" strokeWidth="3" fill="none" opacity={0.6} />
                 
                 {/* Failover Path (Primary to Backup) */}
                 <path d="M 900 250 L 1000 250" 
                    stroke={nodes.find(n => n.id === 'n6')?.status === 'offline' ? 'rgba(255,255,255,0.1)' : '#f59e0b'} 
                    strokeDasharray="5,5" strokeWidth="2" fill="none" 
                 />

                 {/* Animated Traffic Dots */}
                 {activeTraffic && (
                    <>
                       <circle r="4" fill="#60a5fa" filter="url(#glow)">
                          <animateMotion dur="2s" repeatCount="indefinite" path="M 200 340 L 250 340" />
                       </circle>
                       <circle r="4" fill="#60a5fa" filter="url(#glow)">
                          <animateMotion dur="1s" repeatCount="indefinite" path="M 400 340 L 450 340" />
                       </circle>
                       {/* Divert traffic based on status */}
                       {nodes.find(n => n.id === 'n4')?.status === 'active' ? (
                         <circle r="4" fill="#10b981" filter="url(#glow)">
                            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 600 340 C 675 340, 675 250, 750 250" />
                         </circle>
                       ) : (
                         <circle r="4" fill="#ef4444" filter="url(#glow)">
                            <animateMotion dur="1s" repeatCount="indefinite" path="M 600 340 C 675 340, 675 250, 750 250" />
                         </circle>
                       )}
                       {nodes.find(n => n.id === 'n6')?.status === 'active' && (
                         <circle r="6" fill="#f59e0b" filter="url(#glow)">
                            <animateMotion dur="1s" repeatCount="indefinite" path="M 900 250 L 1000 250" />
                         </circle>
                       )}
                    </>
                 )}
              </svg>

              {/* Render Nodes */}
              {nodes.map(node => (
                 <div
                    key={node.id}
                    onClick={() => setActiveNode(node)}
                    className={cn(
                       "absolute w-[180px] p-4 rounded-xl border-2 shadow-2xl transition-all duration-300 cursor-pointer backdrop-blur-md",
                       activeNode?.id === node.id ? "ring-4 ring-white/20 scale-105 z-50" : "z-10",
                       node.status === 'offline' ? "bg-slate-900/80 border-slate-700 opacity-60" :
                       node.status === 'warning' ? "bg-amber-900/40 border-amber-500/50" :
                       node.type === 'trigger' ? "bg-blue-900/40 border-blue-500/50 hover:border-blue-400" :
                       node.type === 'condition' ? "bg-indigo-900/40 border-indigo-500/50 hover:border-indigo-400" :
                       node.type === 'failover' ? "bg-amber-900/40 border-amber-500/50 hover:border-amber-400" :
                       "bg-emerald-900/40 border-emerald-500/50 hover:border-emerald-400"
                    )}
                    style={{ left: node.x, top: node.y }}
                 >
                    <div className="flex items-start gap-3">
                       <div className={cn(
                          "p-2 rounded-lg",
                          node.status === 'offline' ? 'bg-slate-800 text-slate-500' :
                         (node.type === 'trigger' ? 'bg-blue-500/20 text-blue-400' : 
                          node.type === 'condition' ? 'bg-indigo-500/20 text-indigo-400' : 
                          node.type === 'failover' ? 'bg-amber-500/20 text-amber-400' : 
                          'bg-emerald-500/20 text-emerald-400')
                       )}>
                          {node.type === 'trigger' && <Globe className="w-5 h-5" />}
                          {node.type === 'condition' && <Cpu className="w-5 h-5" />}
                          {node.type === 'gateway' && <Server className="w-5 h-5" />}
                          {node.type === 'failover' && <ShieldAlert className="w-5 h-5" />}
                       </div>
                       <div>
                          <h4 className={cn("font-bold text-sm leading-tight", node.status === 'offline' ? 'text-slate-400' : 'text-slate-200')}>{node.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">{node.description}</p>
                       </div>
                    </div>
                    {node.status === 'active' && activeTraffic && (
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    )}
                    {node.status === 'offline' && (
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
                    )}
                 </div>
              ))}

              {/* Configure Panel Slide-out */}
              <div 
                 className={cn(
                    "absolute top-0 right-0 h-full w-80 bg-[#0A0D14]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl transition-transform duration-500 z-50 flex flex-col p-6",
                    activeNode ? "translate-x-0" : "translate-x-full"
                 )}
              >
                 {activeNode && (
                    <>
                       <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                          <div>
                             <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{activeNode.type} Node</div>
                             <h3 className="text-xl font-black text-white">{activeNode.title}</h3>
                          </div>
                          <button onClick={() => setActiveNode(null)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded flex items-center justify-center">
                             ✕
                          </button>
                       </div>
                       
                       <div className="space-y-6 flex-1">
                          <div>
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                             <p className="text-sm text-slate-300">{activeNode.description}</p>
                          </div>

                          <div>
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Runtime Rules</label>
                             <div className="space-y-2">
                                {activeNode.rules?.map((rule, idx) => (
                                   <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded text-sm text-white flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                      <span>{rule}</span>
                                   </div>
                                ))}
                             </div>
                          </div>

                          <div>
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Status override</label>
                             <select 
                                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded p-2 outline-none"
                                value={activeNode.status}
                                onChange={(e) => {
                                   const val = e.target.value as any;
                                   setNodes(prev => prev.map(n => n.id === activeNode.id ? { ...n, status: val } : n));
                                   setActiveNode({ ...activeNode, status: val });
                                }}
                             >
                                <option value="active">Active (Routing Online)</option>
                                <option value="warning">Warning (High Latency)</option>
                                <option value="offline">Offline (Drop Traffic)</option>
                             </select>
                          </div>
                       </div>

                       <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-auto">Save Configuration</Button>
                    </>
                 )}
              </div>
          </div>

       </div>
    </div>
  );
}
