'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Trophy,
  XCircle,
  FileText,
  Plus,
  ChevronRight,
  AlertCircle,
  Scale,
  Send,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { disputesApi } from '@/lib/api';

type Dispute = {
  id: string;
  transaction_id: string;
  amount: string;
  currency: string;
  reason: string;
  status: string;
  description?: string;
  evidence?: string;
  due_by?: string;
  resolved_at?: string;
  created_at: string;
};

type DisputeStats = {
  total: number;
  open: number;
  under_review: number;
  won: number;
  lost: number;
  win_rate: number;
};

const REASON_LABELS: Record<string, string> = {
  fraudulent: 'Fraudulent Transaction',
  product_not_received: 'Product Not Received',
  duplicate: 'Duplicate Charge',
  subscription_canceled: 'Subscription Canceled',
  general: 'General Dispute',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertTriangle className="w-3 h-3" /> },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
  won: { label: 'Won', color: 'bg-green-100 text-green-800 border-green-200', icon: <Trophy className="w-3 h-3" /> },
  lost: { label: 'Lost', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <XCircle className="w-3 h-3" /> },
  closed: { label: 'Closed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <ShieldCheck className="w-3 h-3" /> },
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected dispute for detail / evidence
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState('');

  // Create dispute dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    transaction_id: '',
    amount: '',
    reason: 'fraudulent',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    setError('');
    try {
      const disputesRes = await disputesApi.list();
      const list: Dispute[] = disputesRes?.data || [];
      setDisputes(list);
      // Compute stats locally from the list
      const open = list.filter(d => d.status === 'open').length;
      const underReview = list.filter(d => d.status === 'under_review').length;
      const won = list.filter(d => d.status === 'won').length;
      const lost = list.filter(d => d.status === 'lost').length;
      setStats({
        total: list.length,
        open,
        under_review: underReview,
        won,
        lost,
        win_rate: won + lost > 0 ? (won / (won + lost)) * 100 : 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = (d: Dispute) => {
    setSelected(d);
    setEvidence(d.evidence || '');
    setEvidenceSuccess('');
    setShowDetail(true);
  };

  const handleSubmitEvidence = async () => {
    if (!selected || !evidence.trim()) return;
    setIsSubmittingEvidence(true);
    try {
      await disputesApi.submitEvidence(selected.id, evidence);
      setEvidenceSuccess('Evidence submitted! Dispute is now Under Review.');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit evidence');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.transaction_id || !createForm.amount) return;
    setIsCreating(true);
    try {
      await disputesApi.create({
        transaction_id: createForm.transaction_id,
        amount: parseFloat(createForm.amount),
        reason: createForm.reason,
        description: createForm.description,
      });
      setShowCreate(false);
      setCreateForm({ transaction_id: '', amount: '', reason: 'fraudulent', description: '' });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create dispute');
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = disputes.filter(d => statusFilter === 'all' || d.status === statusFilter);

  const daysLeft = (dueBy?: string) => {
    if (!dueBy) return null;
    const diff = Math.ceil((new Date(dueBy).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Scale className="w-8 h-8 text-orange-500" />
            Disputes & Chargebacks
          </h1>
          <p className="text-muted-foreground mt-1">Manage payment disputes and submit evidence to win chargebacks.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Report Dispute
        </Button>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Disputes</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              <p className="text-xs text-red-600/80 mt-1">Open — Action Required</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.under_review}</p>
              <p className="text-xs text-yellow-600/80 mt-1">Under Review</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.won}</p>
              <p className="text-xs text-green-600/80 mt-1">Won</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.win_rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'open', 'under_review', 'won', 'lost', 'closed'].map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </Button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-3">
        {isLoading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading disputes…</CardContent></Card>
        )}

        {!isLoading && filtered.length === 0 && (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground">No disputes found</p>
              <p className="text-muted-foreground mt-1">
                {statusFilter === 'all' ? 'Great news — you have no chargebacks!' : `No ${statusFilter} disputes.`}
              </p>
            </CardContent>
          </Card>
        )}

        {filtered.map(d => {
          const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.closed;
          const left = daysLeft(d.due_by);
          return (
            <Card
              key={d.id}
              className="border-border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenDetail(d)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">#{d.id.slice(0, 8)}</span>
                      {d.status === 'open' && left !== null && (
                        <span className={`text-xs font-medium ${left <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                          ⏰ {left}d to respond
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">{REASON_LABELS[d.reason] || d.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      TXN: <span className="font-mono">{d.transaction_id.slice(0, 8)}…</span>
                      {d.description && ` — ${d.description}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Filed {formatDate(d.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{formatCurrency(parseFloat(d.amount))}</p>
                      <p className="text-xs text-muted-foreground">{d.currency}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dispute Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (() => {
            const sc = STATUS_CONFIG[selected.status] || STATUS_CONFIG.closed;
            const left = daysLeft(selected.due_by);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-orange-500" />
                    Dispute Details
                  </DialogTitle>
                  <DialogDescription>
                    Dispute #{selected.id.slice(0, 8)} — {REASON_LABELS[selected.reason]}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* Status + amount banner */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                      {selected.status === 'open' && left !== null && (
                        <p className={`mt-2 text-sm font-medium ${left <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                          Response deadline: {left > 0 ? `${left} days left` : 'Overdue'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(parseFloat(selected.amount))}</p>
                      <p className="text-xs text-muted-foreground">{selected.currency}</p>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Transaction ID</p><p className="font-mono font-medium">{selected.transaction_id.slice(0, 12)}…</p></div>
                    <div><p className="text-muted-foreground">Reason</p><p className="font-medium">{REASON_LABELS[selected.reason]}</p></div>
                    <div><p className="text-muted-foreground">Filed On</p><p className="font-medium">{formatDate(selected.created_at)}</p></div>
                    {selected.resolved_at && <div><p className="text-muted-foreground">Resolved On</p><p className="font-medium">{formatDate(selected.resolved_at)}</p></div>}
                    {selected.due_by && <div><p className="text-muted-foreground">Due By</p><p className={`font-medium ${left !== null && left <= 2 ? 'text-red-600' : ''}`}>{formatDate(selected.due_by)}</p></div>}
                  </div>

                  {selected.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm bg-muted/40 rounded-lg p-3">{selected.description}</p>
                    </div>
                  )}

                  {/* Evidence section */}
                  {(selected.status === 'open' || selected.status === 'under_review') && (
                    <div className="border rounded-xl p-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-blue-700 dark:text-blue-400">Submit Evidence</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Provide shipping records, delivery confirmations, communication logs, or any proof that this transaction was legitimate.
                      </p>
                      {evidenceSuccess && (
                        <Alert className="border-green-200 bg-green-50">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700">{evidenceSuccess}</AlertDescription>
                        </Alert>
                      )}
                      <Textarea
                        placeholder="Describe your evidence here: order details, customer communication, delivery proof, etc…"
                        value={evidence}
                        onChange={e => setEvidence(e.target.value)}
                        rows={5}
                        className="bg-background"
                      />
                      <Button
                        onClick={handleSubmitEvidence}
                        disabled={isSubmittingEvidence || !evidence.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSubmittingEvidence ? 'Submitting…' : 'Submit Evidence for Review'}
                      </Button>
                    </div>
                  )}

                  {selected.evidence && selected.status !== 'open' && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Submitted Evidence</p>
                      <pre className="text-sm bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">{selected.evidence}</pre>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create Dispute Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              Report a Dispute
            </DialogTitle>
            <DialogDescription>
              File a new dispute for a payment transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Transaction ID</Label>
              <Input
                placeholder="Paste transaction UUID"
                value={createForm.transaction_id}
                onChange={e => setCreateForm({ ...createForm, transaction_id: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Disputed Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={createForm.amount}
                onChange={e => setCreateForm({ ...createForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={createForm.reason} onValueChange={v => setCreateForm({ ...createForm, reason: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Additional details about the dispute…"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !createForm.transaction_id || !createForm.amount}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isCreating ? 'Filing…' : 'File Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
