'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Download, 
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import TransactionDetailModal from '@/components/dashboard/transaction-detail-modal';
import { TransactionList } from '@/components/transactions/transaction-list';
import CreatePaymentModal from '@/components/transactions/create-payment-modal';
import { usePagination } from '@/hooks/usePagination';
import { Transaction } from '@/lib/api';
import { merchantsApi } from '@/lib/api';

type BackendTransaction = {
  id: string;
  merchant_id: string;
  amount: any;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  order_id?: string;
  customer_email?: string;
  customer_phone?: string;
  fraud_score?: number;
};

function mapStatus(status: string): Transaction['status'] {
  switch ((status || '').toLowerCase()) {
    case 'success':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'initiated':
    case 'processing':
    default:
      return 'pending';
  }
}

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const pagination = usePagination(10);

  const { page, limit, total, setTotal } = pagination;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const offset = (page - 1) * limit;

        const statusParam =
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'completed'
              ? 'success'
              : statusFilter;

        const res = await merchantsApi.getTransactions({
          limit,
          offset,
          status: statusParam,
        });

        const resAny: any = res;
        const rows: BackendTransaction[] = resAny?.data || [];

        const totalFromApi = Number(resAny?.total ?? rows.length);

        const mapped: Transaction[] = rows.map((t) => ({
          id: t.id,
          amount: Number(t.amount ?? 0),
          status: mapStatus(t.status),
          payment_method: t.payment_method || 'card',
          created_at: t.created_at,
          order_id: t.order_id,
          customer_email: t.customer_email,
          customer_phone: t.customer_phone,
          fraud_score: t.fraud_score,
        }));

        console.log('Transactions loaded', { rows, mapped, totalFromApi });

        if (!cancelled) {
          setTransactions(mapped);
          setTotal(totalFromApi);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load transactions');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, limit, statusFilter, setTotal]);

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = txn.id.includes(searchTerm) || 
                         txn.order_id?.includes(searchTerm) ||
                         txn.customer_email?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handleRefund = async (id: string) => {
    if (!confirm('Refund this transaction?')) return;
    try {
      // Find the transaction to get its amount
      const txn = transactions.find(t => t.id === id);
      const amount = txn?.amount || 0;
      await merchantsApi.refundTransaction(id, { amount, reason: 'Customer requested' });
      // Refetch transactions
      window.location.reload();
    } catch (e) {
      alert('Refund failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleCapture = async (id: string) => {
    if (!confirm('Capture this transaction?')) return;
    try {
      await merchantsApi.captureTransaction(id);
      // Refetch transactions
      window.location.reload();
    } catch (e) {
      alert('Capture failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleCreatePayment = () => {
    setShowCreateModal(true);
  };

  const handleCreatePaymentSuccess = () => {
    setShowCreateModal(false);
    window.location.reload();
  };

  const handleDetails = (id: string) => {
    const txn = transactions.find(t => t.id === id);
    if (txn) setSelectedTransaction(txn);
  };

  return (
    <div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Transactions</h1>
              <p className="text-muted-foreground">View and manage all your payment transactions</p>
            </div>
            <Button onClick={handleCreatePayment}>
              Create Payment
            </Button>
          </div>

          {/* Filters */}
          <Card className="border-border mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transaction ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-card border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Date Range</label>
                  <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => {
                    const sonner = require('sonner');
                    sonner.toast.success('Date picker coming soon!');
                  }}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Last 30 days
                  </Button>
                </div>

                <div className="space-y-2 flex items-end">
                  <Button className="w-full bg-accent hover:bg-accent/90" onClick={() => {
                    const sonner = require('sonner');
                    sonner.toast.success('Export started. Your download will begin shortly.');
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Showing {paginatedTransactions.length} of {total} transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList
                transactions={paginatedTransactions}
                isLoading={isLoading}
                onRefund={handleRefund}
                onCapture={handleCapture}
                onDetails={handleDetails}
              />
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.previousPage}
                disabled={!pagination.hasPreviousPage}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {/* Create Payment Modal */}
      <CreatePaymentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreatePaymentSuccess}
      />
    </div>
  );
}
