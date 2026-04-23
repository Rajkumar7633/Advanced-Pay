'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShieldAlert, Building2, Mail, Link as LinkIcon, Briefcase, Calendar, ChevronLeft, MapPin, CheckCircle, Ban, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function GlobalComplianceCenter() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Auto-redirect if not admin based on local token
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') !== 'true') {
      router.replace('/admin/login');
      return;
    }
    fetchMerchants();
  }, [router]);

  const getHeaders = () => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    const token = sessionStorage.getItem('admin_token') || '';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/merchants', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load merchant data');
      const json = await res.json();
      // Ensure it is an array
      setMerchants(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      toast.error('Compliance Engine Error', { description: 'Could not execute backend sync.' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (merchantId: string, newStatus: string) => {
    try {
      setUpdatingId(merchantId);
      const res = await fetch(`/api/v1/admin/merchants/${merchantId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
      
      toast.success('Underwriting Decision Recorded', {
        description: `Merchant has been marked as ${newStatus.toUpperCase()}`
      });

      // Optimistically update local array
      setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, status: newStatus } : m));
    } catch (e) {
      toast.error('Operation Failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
     return (
       <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
         <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
         <p className="text-emerald-500/50 font-mono tracking-widest uppercase text-xs">Loading Compliance Tunnels...</p>
       </div>
     );
  }

  // Analytics derivations
  const total = merchants.length;
  const approved = merchants.filter(m => m.status === 'approved' || m.status === 'active').length;
  const pending = merchants.filter(m => m.status === 'pending_approval' || m.status === 'pending').length;
  const suspended = merchants.filter(m => m.status === 'suspended').length;

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-10 font-sans text-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Background FX */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <button 
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center gap-2 text-xs font-mono text-emerald-500/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
            >
                <ChevronLeft className="w-4 h-4" /> Back to Operations
            </button>
            <div>
              <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
                Underwriting Desk
              </h1>
              <p className="text-slate-400 mt-2 font-mono text-sm max-w-xl">
                Global compliance center. No merchant can process live financial network volume until mathematically underwritten and approved below.
              </p>
            </div>
          </div>

          <div className="flex gap-4 relative z-10 w-full md:w-auto">
             {[
               { label: 'Total', val: total, color: 'text-blue-400' },
               { label: 'Approved', val: approved, color: 'text-emerald-400' },
               { label: 'Pending', val: pending, color: 'text-amber-400' },
             ].map(stat => (
               <div key={stat.label} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 md:w-32 text-center">
                 <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                 <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">{stat.label}</p>
               </div>
             ))}
          </div>
        </div>

        {/* Global Merchant Grid */}
        <div className="grid grid-cols-1 gap-6">
           {merchants.length === 0 ? (
               <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 font-mono text-sm">
                   No Merchants in Database
               </div>
           ) : (
               merchants.map((merchant) => {
                   
                   // Determine Status UI Colors
                   const status = (merchant.status || merchant.kyc_status || 'pending').toLowerCase();
                   let headerColor = 'bg-slate-900';
                   let badgeColor = 'bg-slate-800 text-slate-300';
                   let borderAccent = 'border-slate-800';

                   if (status.includes('approv') || status === 'active') {
                       headerColor = 'bg-emerald-950/20';
                       badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                       borderAccent = 'border-emerald-500/20';
                   } else if (status.includes('suspend') || status.includes('reject')) {
                       headerColor = 'bg-red-950/20';
                       badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                       borderAccent = 'border-red-500/20';
                   } else {
                       headerColor = 'bg-amber-950/20';
                       badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                       borderAccent = 'border-amber-500/20';
                   }

                   return (
                       <Card key={merchant.id} className={`bg-slate-900/50 backdrop-blur-xl border ${borderAccent} transition-all hover:border-slate-700`}>
                           <div className={`p-4 border-b ${borderAccent} ${headerColor} flex justify-between items-center rounded-t-xl`}>
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-white shadow-inner">
                                       {merchant.name?.[0]?.toUpperCase() || 'M'}
                                   </div>
                                   <div>
                                       <h3 className="font-bold text-white text-lg tracking-tight leading-none">
                                           {merchant.name || 'Unnamed Business'}
                                       </h3>
                                       <p className="text-slate-500 font-mono text-[10px] mt-1">{merchant.id}</p>
                                   </div>
                               </div>
                               <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-widest ${badgeColor}`}>
                                   {status}
                               </Badge>
                           </div>

                           <CardContent className="p-6">
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                   {/* Column 1: Identity */}
                                   <div className="space-y-3">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3"/> Contact</p>
                                       <div className="text-sm">
                                           <p className="text-slate-300 truncate">{merchant.email}</p>
                                           <p className="text-slate-400">{merchant.phone || 'No phone'}</p>
                                       </div>
                                   </div>

                                   {/* Column 2: Context */}
                                   <div className="space-y-3">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><Briefcase className="w-3 h-3"/> Industry</p>
                                       <div className="text-sm">
                                           <div className="flex gap-2 items-center text-slate-300">
                                              <Badge variant="secondary" className="bg-slate-800 text-slate-300">{merchant.industry || 'General'}</Badge>
                                           </div>
                                           {merchant.website && (
                                              <a href={merchant.website} target="_blank" className="text-blue-400 hover:text-blue-300 text-xs flex gap-1 items-center mt-2 truncate">
                                                 <LinkIcon className="w-3 h-3" /> {merchant.website}
                                              </a>
                                           )}
                                       </div>
                                   </div>

                                   {/* Column 3: Locality */}
                                   <div className="space-y-3">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</p>
                                       <div className="text-sm text-slate-300">
                                           {merchant.city ? (
                                              <p>{merchant.city}, {merchant.country}</p>
                                           ) : (
                                              <p className="text-slate-500 italic">Address unverified</p>
                                           )}
                                           <div className="mt-2 text-xs text-slate-500 font-mono flex items-center gap-1">
                                              <Calendar className="w-3 h-3" /> {merchant.date || 'Unknown date'}
                                           </div>
                                       </div>
                                   </div>

                                   {/* Column 4: Underwriting Actions */}
                                   <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 flex flex-col justify-center">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 text-center">Decision Board</p>
                                       
                                       <div className="flex flex-col gap-2">
                                           {!(status.includes('approv') || status === 'active') && (
                                              <Button 
                                                 onClick={() => updateStatus(merchant.id, 'approved')}
                                                 disabled={updatingId === merchant.id}
                                                 className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-0"
                                              >
                                                 {updatingId === merchant.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve Live Data</>}
                                              </Button>
                                           )}

                                           {!status.includes('suspend') && (
                                              <Button 
                                                 onClick={() => updateStatus(merchant.id, 'suspended')}
                                                 disabled={updatingId === merchant.id}
                                                 variant="outline"
                                                 className="w-full text-xs font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 bg-slate-900"
                                              >
                                                 {updatingId === merchant.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4 mr-2" /> Suspend Merchant</>}
                                              </Button>
                                           )}
                                           
                                           {status !== 'pending_approval' && (status.includes('approv') || status === 'active' || status.includes('suspend')) && (
                                              <Button 
                                                 onClick={() => updateStatus(merchant.id, 'pending_approval')}
                                                 disabled={updatingId === merchant.id}
                                                 variant="ghost"
                                                 className="w-full text-xs font-bold text-slate-500 hover:text-slate-300"
                                              >
                                                 <Clock className="w-3 h-3 mr-2" /> Revert to Pending
                                              </Button>
                                           )}
                                       </div>
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
