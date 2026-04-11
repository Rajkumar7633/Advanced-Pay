'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, GlobeLock, Target, Activity, Zap, Play, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface FraudAnomaly {
  id: string;
  merchant_id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  customer_email: string;
  customer_ip: string;
  fraud_score: number;
  created_at: string;
}

export default function SuperAdminRiskCenter() {
  const [anomalies, setAnomalies] = useState<FraudAnomaly[]>([]);
  const [stats, setStats] = useState({
    blocked_volume: 0,
    active_nodes: 4,
    threat_level: "NOMINAL",
    traces_scanned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: Since this is an admin boundary, auth token fetching is required in production.
    const adminToken = sessionStorage.getItem('admin_token');
    if (!adminToken) {
      console.warn("No SuperAdmin JWT logic token found inline");
    }

    fetch('/api/v1/admin/fraud-alerts', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("HTTP Access Denied / Invalid Token mapping");
        return res.json();
      })
      .then(data => {
        if (data && data.data) {
          setAnomalies(data.data);
        }
        if (data && data.stats) {
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Risk Center Polling execution breakdown: ", e);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background relative overflow-hidden">
      
      {/* ── Top Navigation Bar ── */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-40 transition-all shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-semibold">Back to OS</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 border border-white/10">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-foreground bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">Global Risk Center</h1>
                <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">ML Threat Hunting</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">Global Risk Center <Badge className="bg-red-500">ML ACTIVE</Badge></h1>
            <p className="text-muted-foreground mt-1 font-mono text-xs">Autonomous anomaly detection models & algorithmic hard-blocks</p>
          </div>
        </div>
      </div>

      {/* ── Top Threat Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
            { tag: 'Blocked Volume (24h)', stat: '₹' + stats.blocked_volume.toLocaleString(undefined, {minimumFractionDigits: 2}), sub: 'Mathematical anomaly intercepts', icon: Zap },
            { tag: 'Active Neural Networks', stat: `${stats.active_nodes} Nodes`, sub: 'V2 Risk Matrix Active', icon: Activity },
            { tag: 'Current Threat Level', stat: stats.threat_level, sub: stats.threat_level === 'CRITICAL' ? 'High attack surface detected' : 'Standard monitoring active', icon: Target },
            { tag: 'Deep PCI Traces', stat: (stats.traces_scanned / 1000000).toFixed(1) + 'M', sub: 'Total packets analyzed globally', icon: GlobeLock },
        ].map((item, idx) => (
            <Card key={idx} className="bg-black/40 backdrop-blur-md border-red-900/30 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent -translate-x-full group-hover:animate-[glimmer_1s_infinite]" />
              <CardContent className="p-6 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <p className="text-[10px] font-black tracking-widest uppercase text-red-400/80">{item.tag}</p>
                      <item.icon className="w-4 h-4 text-red-500 opacity-80" />
                  </div>
                  <h3 className={`text-2xl font-bold ${item.stat === 'CRITICAL' ? 'text-red-500 animate-pulse' : 'text-red-50'}`}>{item.stat}</h3>
                  <p className="text-xs text-red-300/50 mt-1">{item.sub}</p>
              </CardContent>
            </Card>
        ))}
      </div>

      {/* ── Real-Time JSON Traces ── */}
      <Card className="border-red-900/20 bg-black/40">
        <CardHeader>
          <CardTitle className="text-red-50 flex items-center gap-2"><Play className="w-4 h-4 text-red-500" /> Autonomous Hard Blocks</CardTitle>
          <CardDescription className="text-red-300/50">Live feed of transactions blocked because Fraud Score exceeds mathematical thresholds &gt;= 85</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-red-900/20">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-red-950/30 text-red-400 font-mono text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Anomaly ID</th>
                  <th className="px-6 py-4">Threat Intel</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Payload Vector</th>
                  <th className="px-6 py-4 text-right">Time Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-900/20 bg-red-950/10">
                {anomalies.map((tx) => (
                  <tr key={tx.id} className="hover:bg-red-900/20 transition-colors group">
                    <td className="px-6 py-4 font-mono text-red-50/70">{tx.id.split('-')[0]}...</td>
                    <td className="px-6 py-4">
                      <div className="text-red-50 font-medium">{tx.customer_email}</div>
                      <div className="text-red-400/70 text-xs font-mono">{tx.customer_ip}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-red-950 border border-red-500/50 text-red-500 font-black tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                        {tx.fraud_score} / 100
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-red-50/80">{tx.currency} {tx.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-red-400/50 uppercase mt-1">VIA {tx.payment_method}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-red-300/60 text-xs">
                       {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                
                {anomalies.length === 0 && !loading && (
                    <tr>
                        <td colSpan={5} className="py-12 text-center text-red-300/40 text-xs font-mono tracking-widest uppercase">
                            No active mathematical anomalies detected on the physical layer.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
