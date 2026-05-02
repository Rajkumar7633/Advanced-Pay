'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ShieldAlert, GlobeLock, Target, Activity, Zap, Play, ArrowLeft, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface FraudAnomaly {
  id: string;
  merchant_id: string;
  merchant_name: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  customer_email: string;
  customer_ip: string;
  fraud_score: number;
  status: string;
  created_at: string;
}

interface MerchantGroup {
  merchant_name: string;
  merchant_id: string;
  transactions: FraudAnomaly[];
  totalAmount: number;
  avgScore: number;
  maxScore: number;
  currency: string;
}

interface RiskStats {
  blocked_volume: number;
  active_nodes: number;
  threat_level: string;
  traces_scanned: number;
}

function getRiskColor(score: number) {
  if (score >= 70) return { label: 'HIGH', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
  if (score >= 50) return { label: 'MED',  color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' };
  return                  { label: 'LOW',  color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)'  };
}

function getStatusColor(status: string) {
  if (status === 'success')          return '#22c55e';
  if (status === 'failed')           return '#ef4444';
  if (status === 'requires_action')  return '#f97316';
  if (status === 'processing')       return '#3b82f6';
  return '#94a3b8';
}

const cell: React.CSSProperties = { padding: '14px 16px', verticalAlign: 'middle' };
const hdr:  React.CSSProperties = { padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid rgba(239,68,68,0.1)', whiteSpace: 'nowrap' };

export default function SuperAdminRiskCenter() {
  const [anomalies, setAnomalies] = useState<FraudAnomaly[]>([]);
  const [stats, setStats] = useState<RiskStats>({ blocked_volume: 0, active_nodes: 4, threat_level: 'NOMINAL', traces_scanned: 0 });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : '';
      const res = await fetch('/api/v1/admin/fraud-alerts', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Denied');
      const data = await res.json();
      if (data?.data)  setAnomalies(data.data);
      if (data?.stats) setStats(data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Group by merchant_name
  const groups: MerchantGroup[] = useMemo(() => {
    const map: Record<string, FraudAnomaly[]> = {};
    anomalies.forEach(tx => {
      const key = tx.merchant_name || tx.merchant_id || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    });
    return Object.entries(map).map(([name, txs]) => ({
      merchant_name: name,
      merchant_id:   txs[0].merchant_id,
      transactions:  txs,
      totalAmount:   txs.reduce((s, t) => s + (Number(t.amount) || 0), 0),
      avgScore:      Math.round(txs.reduce((s, t) => s + (t.fraud_score || 0), 0) / txs.length),
      maxScore:      Math.max(...txs.map(t => t.fraud_score || 0)),
      currency:      txs[0].currency || 'INR',
    })).sort((a, b) => b.maxScore - a.maxScore);
  }, [anomalies]);

  const toggle = (name: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  const expandAll   = () => setExpanded(new Set(groups.map(g => g.merchant_name)));
  const collapseAll = () => setExpanded(new Set());

  const statCards = [
    { tag: 'Blocked Volume',      val: '₹' + (stats.blocked_volume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), sub: 'Intercepted this session',     icon: Zap,       accent: '#ef4444' },
    { tag: 'Active Neural Nodes', val: `${stats.active_nodes} Nodes`,                                                              sub: 'V2 Risk Matrix Online',      icon: Activity,  accent: '#f97316' },
    { tag: 'Threat Level',        val: stats.threat_level,                                                                          sub: stats.threat_level === 'CRITICAL' ? '⚠ High attack surface' : 'Standard monitoring', icon: Target, accent: stats.threat_level === 'CRITICAL' ? '#ef4444' : stats.threat_level === 'ELEVATED' ? '#f97316' : '#22c55e' },
    { tag: 'PCI Traces Scanned',  val: ((stats.traces_scanned || 0) / 1_000_000).toFixed(1) + 'M',                                sub: 'Packets analyzed globally',  icon: GlobeLock, accent: '#8b5cf6' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(239,68,68,0.15)', background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
              <ArrowLeft size={15} /> Back to OS
            </Link>
            <div style={{ width: 1, height: 24, background: 'rgba(239,68,68,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#dc2626,#ea580c)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(239,68,68,0.4)' }}>
                <ShieldAlert size={18} color="white" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#fca5a5' }}>Global Risk Center</p>
                <p style={{ margin: 0, fontSize: 10, color: '#6b7280', letterSpacing: '0.14em', textTransform: 'uppercase' }}>ML Threat Hunting · Live</p>
              </div>
            </div>
          </div>
          <button onClick={() => fetchData(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '7px 14px', color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px' }}>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={26} color="#ef4444" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
              Global Risk Center
              <span style={{ fontSize: 11, fontWeight: 700, background: '#ef4444', color: 'white', padding: '2px 10px', borderRadius: 100 }}>ML ACTIVE</span>
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>
              Merchants grouped by risk · {groups.length} flagged merchant{groups.length !== 1 ? 's' : ''} · {anomalies.length} total records
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, marginBottom: 28 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: '#0f172a', border: `1px solid ${s.accent}28`, borderRadius: 16, padding: 22, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, background: s.accent, opacity: 0.07, borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: s.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.tag}</p>
                <s.icon size={15} color={s.accent} />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: s.val === 'CRITICAL' ? '#ef4444' : 'white' }}>{s.val}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Panel */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 20, overflow: 'hidden' }}>

          {/* Panel Header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Play size={15} color="#ef4444" />
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>Risk Transaction Feed</h2>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>Grouped by merchant · fraud score ≥ 30</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={expandAll}   style={{ fontSize: 11, padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#fca5a5', cursor: 'pointer' }}>Expand All</button>
              <button onClick={collapseAll} style={{ fontSize: 11, padding: '5px 12px', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>Collapse All</button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: 34, height: 34, border: '3px solid rgba(239,68,68,0.2)', borderTop: '3px solid #ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#6b7280', marginTop: 14, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scanning threat vectors...</p>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <ShieldAlert size={40} color="rgba(239,68,68,0.25)" />
              <p style={{ color: '#4b5563', fontSize: 13, fontFamily: 'monospace', marginTop: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No flagged transactions found</p>
            </div>
          ) : (
            <div>
              {groups.map((group, gi) => {
                const isOpen = expanded.has(group.merchant_name);
                const risk   = getRiskColor(group.maxScore);
                return (
                  <div key={group.merchant_name} style={{ borderBottom: gi < groups.length - 1 ? '1px solid rgba(239,68,68,0.08)' : 'none' }}>

                    {/* Merchant Group Header Row */}
                    <div
                      onClick={() => toggle(group.merchant_name)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', cursor: 'pointer', background: isOpen ? 'rgba(239,68,68,0.04)' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(239,68,68,0.025)'; }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Expand icon */}
                      <div style={{ color: '#ef4444', flexShrink: 0 }}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>

                      {/* Avatar */}
                      <div style={{ width: 36, height: 36, background: `${risk.color}18`, border: `1px solid ${risk.color}40`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: risk.color, fontSize: 14, flexShrink: 0 }}>
                        {group.merchant_name[0]?.toUpperCase()}
                      </div>

                      {/* Name + ID */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, color: 'white', fontSize: 14 }}>{group.merchant_name}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>{group.merchant_id?.slice(0, 20)}...</p>
                      </div>

                      {/* Stats pills */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6, padding: '3px 10px' }}>
                          <b style={{ color: '#f1f5f9' }}>{group.transactions.length}</b> txns
                        </span>
                        <span style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6, padding: '3px 10px' }}>
                          <b style={{ color: '#f1f5f9' }}>{group.currency} {group.totalAmount.toLocaleString('en-IN')}</b> total
                        </span>
                        <span style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6, padding: '3px 10px' }}>
                          avg <b style={{ color: '#f1f5f9' }}>{group.avgScore}</b>
                        </span>
                        {/* Max score badge */}
                        <span style={{ fontSize: 12, fontWeight: 700, background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: 6, padding: '3px 12px', color: risk.color }}>
                          MAX {group.maxScore} · {risk.label}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Transaction Rows */}
                    {isOpen && (
                      <div style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'rgba(239,68,68,0.04)' }}>
                              <th style={hdr}>TX ID</th>
                              <th style={hdr}>Customer / IP</th>
                              <th style={hdr}>Risk Score</th>
                              <th style={hdr}>Amount</th>
                              <th style={hdr}>Method</th>
                              <th style={hdr}>Status</th>
                              <th style={hdr}>Detected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.transactions.map(tx => {
                              const r = getRiskColor(tx.fraud_score || 0);
                              return (
                                <tr key={tx.id} style={{ borderTop: '1px solid rgba(239,68,68,0.06)' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.03)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <td style={{ ...cell, paddingLeft: 44, fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>
                                    {tx.id?.slice(0, 12)}...
                                  </td>
                                  <td style={cell}>
                                    <p style={{ margin: 0, color: '#cbd5e1' }}>{tx.customer_email || '—'}</p>
                                    <p style={{ margin: 0, color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>{tx.customer_ip || '—'}</p>
                                  </td>
                                  <td style={cell}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: r.bg, border: `1px solid ${r.border}`, borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 900, color: r.color }}>
                                      {tx.fraud_score ?? '—'} <span style={{ fontSize: 9, fontWeight: 700 }}>{r.label}</span>
                                    </span>
                                  </td>
                                  <td style={{ ...cell, fontWeight: 700, color: '#f1f5f9' }}>
                                    {tx.currency} {Number(tx.amount).toLocaleString('en-IN')}
                                  </td>
                                  <td style={cell}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.14)', borderRadius: 5, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      {tx.payment_method || '—'}
                                    </span>
                                  </td>
                                  <td style={{ ...cell, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: getStatusColor(tx.status) }}>
                                    {tx.status || '—'}
                                  </td>
                                  <td style={{ ...cell, color: '#475569', fontSize: 11, whiteSpace: 'nowrap' }}>
                                    {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN') : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
