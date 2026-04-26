'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Activity, Globe, Zap, ArrowRight, Server, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

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
  { id: 'n2', type: 'condition', title: 'Risk Engine', description: 'Fraud Radar Scan', status: 'active', x: 250, y: 300, rules: ['Drop if IP Blocked'] },
  { id: 'n3', type: 'condition', title: 'Smart Router', description: 'Evaluate Currency/Volume', status: 'active', x: 450, y: 300, rules: ['If USD/EUR -> Node 4', 'If INR -> Node 5', 'Offline Failover -> Node 6'] },
  { id: 'n4', type: 'gateway', title: 'AdvancedPay Global Switch', description: 'Direct Visa/MC Acquiring', status: 'active', x: 750, y: 200, rules: ['Connect: Tier-1 Bank Node'] },
  { id: 'n5', type: 'gateway', title: 'AdvancedPay Asia UPI', description: 'Native NPCI Integration', status: 'active', x: 750, y: 400, rules: ['Connect: RBI Switch'] },
  { id: 'n6', type: 'failover', title: 'Reserve Bank Failover', description: 'Emergency Traffic Spool', status: 'offline', x: 1000, y: 200, rules: ['Active only if Node 4 is OFFLINE'] },
];

interface Particle {
  id: string;
  currency: string;
  color: string;
  route: 'primary' | 'asia' | 'backup';
}

interface LogEntry {
  id: string;
  label: string;
  timestamp: string;
}

export default function SmartRoutingPage() {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [activeTraffic, setActiveTraffic] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [activeNode, setActiveNode] = useState<NodeData | null>(null);
  
  // Real-time states
  const [lastTxId, setLastTxId] = useState<string>('');
  const [liveTps, setLiveTps] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [routingLogs, setRoutingLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Derive Gateway states
  const primaryStatus = nodes.find(n => n.id === 'n4')?.status || 'active';
  const isPrimaryDown = primaryStatus === 'offline';

  useEffect(() => {
    // Auto-scroll logs
    if (logsEndRef.current) {
       logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [routingLogs]);

  // Telemetry Poller
  useEffect(() => {
    if (!activeTraffic) return;
    
    let isMounted = true;

    const pullTransactions = async () => {
      try {
        const res = await api.get('/transactions?limit=10&offset=0');
        const list = res.data?.data || res.data || [];
        if (!isMounted || list.length === 0) return;

        // Find totally new transactions since last poll
        const txIds = list.map((t: any) => t.id);
        const lastIdx = txIds.indexOf(lastTxId);
        
        let newTxs = [];
        if (lastIdx === -1 && lastTxId) {
            // all new (lost track) or totally fresh start
            newTxs = [list[0]]; // just pick 1 to not flood visually if lost track
        } else if (lastIdx > 0) {
            newTxs = list.slice(0, lastIdx); // get everything newer than the last tracked ID
        } else if (!lastTxId) {
            newTxs = [list[0]]; // Initial bootstrap, just spawn the most recent 1 to start
        }

        if (newTxs.length > 0) {
            setLastTxId(newTxs[0].id);
            setLiveTps(prev => prev + newTxs.length); // Super rudimentary visual volume metric
            
            // Generate visual particles and logs for these
            newTxs.forEach((tx: any, idx: number) => {
               const cur = (tx.currency || 'USD').toUpperCase();
               
               // Path logic:
               let targetRoute: 'primary' | 'asia' | 'backup' = 'primary';
               let nodeDest = 'Global Switch (Visa/MC)';
               let tColor = '#10b981'; // green for primary

               if (cur === 'INR') {
                  targetRoute = 'asia';
                  nodeDest = 'Asia UPI (NPCI)';
                  tColor = '#3b82f6'; // blue for Asia
               } else {
                  if (nodes.find(n => n.id === 'n4')?.status === 'offline') {
                     targetRoute = 'backup';
                     nodeDest = 'Reserve Failover';
                     tColor = '#f59e0b'; // orange for failover
                  }
               }

               const pId = `${tx.id}-${Date.now()}`;
               
               setTimeout(() => {
                   setParticles(prev => [...prev, { id: pId, currency: cur, color: tColor, route: targetRoute }]);
                   setRoutingLogs(prev => [...prev.slice(-49), { 
                       id: pId, 
                       timestamp: new Date().toLocaleTimeString(), 
                       label: `TX-${tx.id.substring(0,6)} (${tx.amount} ${cur}) → ${nodeDest}` 
                   }]);

                   // Cleanup particle after animation ends (2.5s)
                   setTimeout(() => {
                       setParticles(current => current.filter(p => p.id !== pId));
                   }, 2600);
               }, idx * 250); // Stagger particle spawns
            });
        }

      } catch (e) {
          console.error("Telemetry failed execution", e);
      }
    };

    pullTransactions();
    const inv = setInterval(pullTransactions, 2500); // Check every 2.5s for hyper-responsiveness
    
    // TPS Decay purely for visuals
    const decayInv = setInterval(() => {
        setLiveTps(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
       isMounted = false;
       clearInterval(inv);
       clearInterval(decayInv);
    };
  }, [activeTraffic, lastTxId, nodes]);

  const toggleTestMode = () => {
      setTestMode(prev => {
          if (!prev && !activeTraffic) setActiveTraffic(true);
          return !prev;
      });
  };

  // Synthetic Traffic Load Tester
  useEffect(() => {
    if (!testMode || !activeTraffic) return;
    const inv = setInterval(() => {
        const isINR = Math.random() > 0.7;
        const cur = isINR ? 'INR' : 'USD';
        
        // Path logic follows exactly the same logic
        let targetRoute: 'primary' | 'asia' | 'backup' = 'primary';
        let nodeDest = 'Global Switch (Visa/MC)';
        let tColor = '#10b981';

        if (cur === 'INR') {
            targetRoute = 'asia';
            nodeDest = 'Asia UPI (NPCI)';
            tColor = '#3b82f6';
        } else {
            if (nodes.find(n => n.id === 'n4')?.status === 'offline') {
                targetRoute = 'backup';
                nodeDest = 'Reserve Failover';
                tColor = '#f59e0b';
            }
        }

        const pId = `sim-${Math.random()}`;
        setLiveTps(prev => prev + 3);
        
        setParticles(prev => [...prev, { id: pId, currency: cur, color: tColor, route: targetRoute }]);
        setRoutingLogs(prev => [...prev.slice(-39), { 
            id: pId, 
            timestamp: new Date().toLocaleTimeString(), 
            label: `[SIM] TX-${Math.random().toString(36).substring(2,8)} (${Math.floor(Math.random()*900)+100} ${cur}) → ${nodeDest}` 
        }]);

        setTimeout(() => {
            setParticles(current => current.filter(p => p.id !== pId));
        }, 2600);
    }, 400); // fire a packet every 400ms

    return () => clearInterval(inv);
  }, [testMode, activeTraffic, nodes]);

  const simulateFailure = () => {
    setNodes(prev => prev.map(n => {
       if (n.id === 'n4') return { ...n, status: 'offline', title: 'Global Switch (OFFLINE)' };
       if (n.id === 'n6') return { ...n, status: 'active', title: 'Reserve Failover (Active)' };
       return n;
    }));
  };

  const resetState = () => {
    setNodes(INITIAL_NODES);
    setParticles([]);
    setRoutingLogs([]);
    setLiveTps(0);
    setLastTxId('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0D14] overflow-hidden p-6 gap-6 relative text-slate-200">
       
       <div className="flex justify-between items-center mb-2">
         <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Network className="w-8 h-8 text-blue-500" />
              Hyperscale Smart Routing
            </h1>
            <p className="text-slate-400 mt-1">Real-time gateway topography tracing live production volume.</p>
         </div>
         <div className="flex gap-4">
            <Button
               variant="outline"
               onClick={toggleTestMode}
               className={cn(
                  "transition-colors", 
                  testMode ? "border-purple-500/50 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" : "border-slate-700 text-slate-400 hover:text-white"
               )}
            >
               <Zap className="w-4 h-4 mr-2" />
               {testMode ? "Stop Load Test" : "Inject Load Test"}
            </Button>
            <Button 
               variant="outline" 
               className="border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
               onClick={simulateFailure}
               disabled={isPrimaryDown}
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
            <Button variant="ghost" onClick={resetState}>Reset System</Button>
         </div>
       </div>

       <div className="flex flex-1 gap-6 min-h-0">
          
          {/* Telemetry Sidebar */}
          <Card className="w-80 bg-[#111622] border-slate-800 flex flex-col overflow-hidden shadow-2xl">
             <div className="p-4 border-b border-slate-800 bg-[#0e121b]">
                <h3 className="font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider text-xs">
                   <Globe className="w-4 h-4 text-emerald-500" />
                   Telemetry Array
                </h3>
             </div>
             
             <div className="p-6 flex flex-col h-full">
                <div className="mb-6">
                   <p className="text-sm font-medium text-slate-500 mb-1 tracking-wider uppercase">Live Velocity</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white tabular-nums tracking-tighter">
                         {activeTraffic ? liveTps : '---'}
                      </span>
                      <span className="text-sm text-slate-400 font-mono">/min Volume</span>
                   </div>
                </div>

                <div className="space-y-4 mb-6">
                   <p className="text-sm font-medium text-slate-500 tracking-wider uppercase border-b border-slate-800 pb-2">Availability Zones</p>
                   {['North America (Primary)', 'Europe (Failover)', 'Asia Pacific (INR)'].map((region, i) => (
                      <div key={region} className="flex items-center justify-between">
                         <span className={cn("text-sm transition-colors", region.includes('Primary') && isPrimaryDown ? "text-red-400" : "text-slate-300")}>{region}</span>
                         <span className={cn(
                            "inline-flex h-2 w-2 rounded-full",
                            region.includes('Primary') && isPrimaryDown ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"
                         )} style={{ animationDelay: `${i * 300}ms` }} />
                      </div>
                   ))}
                </div>

                <div className="flex-1 flex flex-col border border-slate-800 rounded bg-[#0a0d14] overflow-hidden">
                    <div className="bg-slate-900 px-3 py-2 text-xs font-mono text-slate-400 border-b border-slate-800 flex items-center justify-between">
                        <span>TRACE LOG</span>
                        {activeTraffic && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[10px]" ref={logsEndRef}>
                        {routingLogs.length === 0 ? (
                            <div className="text-slate-600 text-center mt-10">Awaiting dispatch...</div>
                        ) : routingLogs.map((log) => (
                            <div key={log.id} className="text-slate-300 py-1 border-b border-slate-800/50 flex flex-col gap-1">
                                <span className="text-slate-500">{log.timestamp}</span>
                                <span className={log.label.includes('Failover') ? 'text-amber-400' : log.label.includes('Asia') ? 'text-blue-400' : 'text-emerald-400'}>
                                    {log.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </Card>

          {/* Interactive Flow Canvas */}
          <div className="flex-1 rounded-xl border border-slate-800 bg-[#0A0D14] relative overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[length:40px_40px] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
              
              {/* SVG Connectors Base Box */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                 <defs>
                    <linearGradient id="activeLine" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                       <stop offset="100%" stopColor="rgba(16, 185, 129, 0.4)" />
                    </linearGradient>
                    <linearGradient id="warningLine" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                       <stop offset="100%" stopColor="rgba(245, 158, 11, 0.4)" />
                    </linearGradient>
                    <filter id="glow">
                       <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                       <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                       </feMerge>
                    </filter>
                 </defs>

                 {/* Base Paths for layout */}
                 <path id="path_l1" d="M 200 340 L 250 340" stroke="url(#activeLine)" strokeWidth="3" fill="none" opacity={0.4} />
                 <path id="path_l2" d="M 400 340 L 450 340" stroke="url(#activeLine)" strokeWidth="3" fill="none" opacity={0.4} />
                 
                 {/* To Primary */}
                 <path id="path_primary" d="M 600 340 C 675 340, 675 250, 750 250" 
                    stroke={isPrimaryDown ? 'url(#warningLine)' : 'url(#activeLine)'} 
                    strokeWidth="3" fill="none" opacity={0.6} 
                 />
                 
                 {/* To Asia */}
                 <path id="path_asia" d="M 600 340 C 675 340, 675 450, 750 450" stroke="url(#activeLine)" strokeWidth="3" fill="none" opacity={0.4} />
                 
                 {/* From Primary to Backup Failover Link */}
                 <path id="path_failover" d="M 900 250 L 1000 250" 
                    stroke={isPrimaryDown ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.05)'} 
                    strokeDasharray="5,5" strokeWidth="2" fill="none" 
                 />

                 {/* DYNAMIC PACKETS */}
                 {particles.map((p) => {
                     return (
                         <svg key={`v2-${p.id}`} className="absolute inset-0 w-full h-full pointer-events-none z-20">
                             {/* Packet Glow */}
                             <circle r="4" fill={p.color} style={{ filter: "drop-shadow(0 0 5px " + p.color + ")" }}>
                                 <animateMotion dur="0.5s" begin="0s" fill="freeze" path="M 200 340 L 250 340" />
                                 <animateMotion dur="0.5s" begin="0.5s" fill="freeze" path="M 400 340 L 450 340" />
                                 
                                 <animateMotion dur="0.7s" begin="1s" fill="freeze" 
                                    path={p.route === 'asia' ? "M 600 340 C 675 340, 675 450, 750 450" : "M 600 340 C 675 340, 675 250, 750 250"} 
                                 />
                                 
                                 {p.route === 'backup' && (
                                     <animateMotion dur="0.5s" begin="1.7s" fill="freeze" path="M 900 250 L 1000 250" />
                                 )}
                             </circle>
                             
                             {/* Central Hard Dot */}
                             <circle r="2" fill="#fff">
                                 <animateMotion dur="0.5s" begin="0s" fill="freeze" path="M 200 340 L 250 340" />
                                 <animateMotion dur="0.5s" begin="0.5s" fill="freeze" path="M 400 340 L 450 340" />
                                 <animateMotion dur="0.7s" begin="1s" fill="freeze" 
                                    path={p.route === 'asia' ? "M 600 340 C 675 340, 675 450, 750 450" : "M 600 340 C 675 340, 675 250, 750 250"} 
                                 />
                                 {p.route === 'backup' && (
                                     <animateMotion dur="0.5s" begin="1.7s" fill="freeze" path="M 900 250 L 1000 250" />
                                 )}
                             </circle>
                         </svg>
                     )
                 })}
              </svg>

              {/* Render Nodes HTML */}
              {nodes.map(node => (
                 <div
                    key={node.id}
                    onClick={() => setActiveNode(node)}
                    className={cn(
                       "absolute w-[180px] p-4 rounded-xl border-2 shadow-2xl transition-all duration-300 cursor-pointer backdrop-blur-md",
                       activeNode?.id === node.id ? "ring-4 ring-white/20 scale-[1.02] z-40" : "z-20 hover:scale-[1.02]",
                       node.status === 'offline' ? "bg-slate-900/80 border-red-900/50 opacity-80" :
                       node.status === 'warning' ? "bg-amber-900/40 border-amber-500/50" :
                       node.type === 'trigger' ? "bg-blue-900/40 border-blue-500/50" :
                       node.type === 'condition' ? "bg-indigo-900/60 border-indigo-500/50" :
                       node.type === 'failover' ? (node.status === 'active' ? "bg-amber-900/60 border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.2)]" : "bg-slate-900/40 border-slate-600/50") :
                       "bg-emerald-900/40 border-emerald-500/50"
                    )}
                    style={{ left: node.x, top: node.y }}
                 >
                    <div className="flex items-start gap-3 relative z-10">
                       <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          node.status === 'offline' ? 'bg-red-500/20 text-red-500' :
                         (node.type === 'trigger' ? 'bg-blue-500/20 text-blue-400' : 
                          node.type === 'condition' ? 'bg-indigo-500/20 text-indigo-400' : 
                          node.type === 'failover' ? (node.status === 'active' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-500') : 
                          'bg-emerald-500/20 text-emerald-400')
                       )}>
                          {node.type === 'trigger' && <Globe className="w-4 h-4" />}
                          {node.type === 'condition' && <Cpu className="w-4 h-4" />}
                          {node.type === 'gateway' && <Server className="w-4 h-4" />}
                          {node.type === 'failover' && <ShieldAlert className="w-4 h-4" />}
                       </div>
                       <div>
                          <h4 className={cn("font-bold text-xs leading-tight mb-1", node.status === 'offline' ? 'text-red-400' : 'text-slate-100')}>{node.title}</h4>
                          <p className="text-[10px] text-slate-400 leading-tight">{node.description}</p>
                       </div>
                    </div>
                    
                    {/* Activity Indicators */}
                    {node.status === 'active' && activeTraffic && node.type !== 'failover' && (
                       <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                    )}
                    {node.type === 'failover' && node.status === 'active' && activeTraffic && (
                       <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full animate-ping shadow-[0_0_15px_#f59e0b]" />
                    )}
                    {node.status === 'offline' && (
                       <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_10px_red]">
                          <div className="w-1.5 h-0.5 bg-white rounded-full" />
                       </div>
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
                             <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded border border-slate-800">{activeNode.description}</p>
                          </div>

                          <div>
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Runtime Execution Directives</label>
                             <div className="space-y-2">
                                {activeNode.rules?.map((rule, idx) => (
                                   <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded text-sm text-slate-300 flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                      <span>{rule}</span>
                                   </div>
                                ))}
                             </div>
                          </div>

                          <div className="pt-4 border-t border-slate-800">
                             <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Status override</label>
                             <select 
                                className="w-full bg-slate-900/80 border border-slate-700 text-slate-200 text-sm rounded p-2.5 outline-none focus:border-blue-500"
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

                       <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-auto">Lock Node State</Button>
                    </>
                 )}
              </div>
          </div>
       </div>
    </div>
  );
}
