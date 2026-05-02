'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, ShieldCheck, Building2, Mail, Briefcase, Calendar,
  ChevronLeft, MapPin, CheckCircle, Ban, Clock, Search, RefreshCw,
  TrendingUp, Filter, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'active', 'suspended'];

export default function GlobalComplianceCenter() {
  const router = useRouter();
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getHeaders = () => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    const token = sessionStorage.getItem('admin_token') || '';
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchMerchants = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      const res = await fetch('/api/v1/admin/merchants', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const data = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
      setAllMerchants(data);
      setRefreshCountdown(30);
    } catch {
      toast.error('Compliance sync failed — retrying...');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Auth guard
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') !== 'true') {
      router.replace('/admin/login');
      return;
    }
    fetchMerchants();
  }, [router, fetchMerchants]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchMerchants(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchMerchants]);

  const updateStatus = async (merchantId: string, newStatus: string) => {
    try {
      setUpdatingId(merchantId);
      const res = await fetch(`/api/v1/admin/merchants/${merchantId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Decision Recorded', {
        description: `Merchant marked as ${newStatus.toUpperCase()}`
      });
      setAllMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, status: newStatus } : m));
    } catch {
      toast.error('Operation Failed');
    } finally {
      setUpdatingId(null);
    }
  };

  // Derived filter
  const merchants = allMerchants
    .filter(m => {
      const matchesSearch =
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.industry || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // Stats
  const total     = allMerchants.length;
  const approved  = allMerchants.filter(m => m.status === 'approved' || m.status === 'active').length;
  const pending   = allMerchants.filter(m => m.status === 'pending' || m.status === 'pending_approval').length;
  const suspended = allMerchants.filter(m => m.status === 'suspended').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-emerald-500/50 font-mono tracking-widest uppercase text-xs">Loading Compliance Tunnels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-10 font-sans text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 text-xs font-mono text-emerald-500/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Operations
            </button>
            <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
              Underwriting Desk
            </h1>
            <p className="text-slate-400 font-mono text-sm max-w-xl">
              Global compliance center. No merchant can process live financial network volume until underwritten and approved.
            </p>
          </div>

          {/* Stats + Refresh */}
          <div className="flex flex-col items-end gap-3 relative z-10 w-full md:w-auto">
            <div className="flex gap-3">
              {[
                { label: 'Total',     val: total,     color: 'text-blue-400' },
                { label: 'Approved',  val: approved,  color: 'text-emerald-400' },
                { label: 'Pending',   val: pending,   color: 'text-amber-400' },
                { label: 'Suspended', val: suspended, color: 'text-red-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 w-24 text-center">
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => fetchMerchants(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : `Auto-refresh in ${refreshCountdown}s`}
            </button>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or industry..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === f
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-mono">
            Showing <span className="text-slate-300 font-bold">{merchants.length}</span> of <span className="text-slate-300 font-bold">{total}</span> merchants
            {statusFilter !== 'all' && <span className="text-emerald-400"> · Filter: {statusFilter}</span>}
            {searchQuery && <span className="text-blue-400"> · Search: "{searchQuery}"</span>}
          </p>
        </div>

        {/* Merchant Grid */}
        <div className="grid grid-cols-1 gap-5">
          {merchants.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 gap-3">
              <Filter className="w-8 h-8 opacity-40" />
              <p className="font-mono text-sm">No merchants match your search criteria</p>
              <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Clear filters</button>
            </div>
          ) : (
            merchants.map(merchant => {
              const status = (merchant.status || 'pending').toLowerCase();
              const isApproved = status === 'approved' || status === 'active';
              const isSuspended = status === 'suspended';
              const isPending = !isApproved && !isSuspended;

              let borderAccent = 'border-amber-500/20';
              let headerBg = 'bg-amber-950/10';
              let badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

              if (isApproved) {
                borderAccent = 'border-emerald-500/20';
                headerBg = 'bg-emerald-950/10';
                badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              } else if (isSuspended) {
                borderAccent = 'border-red-500/20';
                headerBg = 'bg-red-950/10';
                badgeClass = 'bg-red-500/10 text-red-400 border-red-500/20';
              }

              const volume = parseFloat(merchant.volume || '0');

              return (
                <Card key={merchant.id} className={`bg-slate-900/60 backdrop-blur-xl border ${borderAccent} hover:border-slate-700 transition-all duration-200 overflow-hidden`}>
                  {/* Card Header */}
                  <div className={`px-6 py-4 border-b ${borderAccent} ${headerBg} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-black text-white shadow-inner text-lg">
                        {merchant.name?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base leading-none">{merchant.name || 'Unnamed Business'}</h3>
                        <p className="text-slate-500 font-mono text-[10px] mt-1 truncate max-w-[220px]">{merchant.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {volume > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <TrendingUp className="w-3 h-3" />
                          ₹{volume.toLocaleString('en-IN')}
                        </div>
                      )}
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-widest ${badgeClass}`}>
                        {status}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Contact */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Contact
                        </p>
                        <p className="text-sm text-slate-300 truncate">{merchant.email}</p>
                        <p className="text-sm text-slate-400">{merchant.phone || '—'}</p>
                      </div>

                      {/* Industry */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Industry
                        </p>
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                          {merchant.industry || 'General'}
                        </Badge>
                      </div>

                      {/* Location */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Location
                        </p>
                        {merchant.city ? (
                          <p className="text-sm text-slate-300">{merchant.city}{merchant.country ? `, ${merchant.country}` : ''}</p>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Address unverified</p>
                        )}
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {merchant.date || '—'}
                        </div>
                      </div>

                      {/* Decision Board */}
                      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/50 flex flex-col justify-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Decision Board</p>

                        {isPending && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(merchant.id, 'approved')}
                            disabled={updatingId === merchant.id}
                            className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 border-0"
                          >
                            {updatingId === merchant.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1.5" /> Approve</>}
                          </Button>
                        )}

                        {!isSuspended && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(merchant.id, 'suspended')}
                            disabled={updatingId === merchant.id}
                            variant="outline"
                            className="w-full text-xs font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 bg-slate-900"
                          >
                            {updatingId === merchant.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Ban className="w-3 h-3 mr-1.5" /> Suspend</>}
                          </Button>
                        )}

                        {(isApproved || isSuspended) && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(merchant.id, 'pending')}
                            disabled={updatingId === merchant.id}
                            variant="ghost"
                            className="w-full text-xs font-bold text-slate-500 hover:text-slate-300"
                          >
                            <Clock className="w-3 h-3 mr-1.5" /> Revert to Pending
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
