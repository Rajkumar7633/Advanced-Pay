'use client';

import { Transaction } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { CheckCircle, AlertCircle, Clock, RotateCcw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TransactionListProps {
  transactions: Transaction[];
  onRefund?: (id: string) => void;
  onCapture?: (id: string) => void;
  onDetails?: (id: string) => void;
  isLoading?: boolean;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'bg-green-500/10 text-green-700 dark:text-green-400',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'bg-red-500/10 text-red-700 dark:text-red-400',
  },
  refunded: {
    icon: RotateCcw,
    label: 'Refunded',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
};

export function TransactionList({
  transactions,
  onRefund,
  onCapture,
  onDetails,
  isLoading,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading transactions...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">No transactions found</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Transaction ID</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Risk</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Method</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const config = statusConfig[txn.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <tr
                key={txn.id}
                className="border-b border-border hover:bg-card transition-colors"
              >
                <td className="py-3 px-4 text-foreground font-medium">{txn.id.slice(-8)}</td>
                <td className="py-3 px-4 text-foreground font-medium">
                  {formatCurrency(txn.amount, 'INR')}
                </td>
                <td className="py-3 px-4">
                  <Badge className={config.color} variant="outline">
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  {txn.fraud_score !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      {txn.fraud_score > 70 ? (
                        <ShieldAlert className="w-4 h-4 text-orange-500" />
                      ) : txn.fraud_score > 40 ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-slate-500" />
                      )}
                      <span className={`text-xs font-semibold ${
                        txn.fraud_score > 70 ? 'text-orange-500' : 
                        txn.fraud_score > 40 ? 'text-yellow-500' : 'text-slate-400'
                      }`}>
                        {txn.fraud_score > 70 ? 'High' : txn.fraud_score > 40 ? 'Med' : 'Low'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-foreground capitalize text-sm">
                  {txn.payment_method || 'Unknown'}
                </td>
                <td className="py-3 px-4 text-muted-foreground text-sm">
                  {formatDate(txn.created_at)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    {onDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDetails(txn.id)}
                        className="text-xs"
                      >
                        View
                      </Button>
                    )}
                    {onCapture && txn.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCapture(txn.id)}
                        className="text-xs"
                      >
                        Capture
                      </Button>
                    )}
                    {onRefund && txn.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRefund(txn.id)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
