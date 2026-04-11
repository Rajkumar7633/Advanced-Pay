'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Calendar, 
  Download, 
  DollarSign, 
  TrendingUp,
  Wallet,
  Banknote,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/formatting';
import { merchantsApi } from '@/lib/api';

type BackendSettlement = {
  id: string;
  merchant_id: string;
  settlement_date: string;
  total_amount: any;
  total_transactions: number;
  fees: any;
  tax: any;
  net_amount: any;
  status: string;
  utr_number?: string;
  settled_at?: string;
  created_at: string;
};

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  ifsc: string;
  accountType: string;
  isDefault: boolean;
  status: string;
}

export default function SettlementsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [settlements, setSettlements] = useState<BackendSettlement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBankDialog, setShowBankDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Load settlements
      const settlementsRes = await merchantsApi.getSettlements();
      setSettlements(settlementsRes?.data || []);

      // Load bank accounts
      const accountsRes = await merchantsApi.getBankAccounts();
      setBankAccounts(accountsRes?.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSettlements = settlements.filter(
    (s) => statusFilter === 'all' || s.status === statusFilter
  );

  const totalPending = settlements
    .filter((s) => s.status === 'pending' || s.status === 'processing')
    .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  const totalCompleted = settlements
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + Number(s.net_amount || 0), 0);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'scheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleGenerateSettlement = async () => {
    try {
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      await merchantsApi.generateSettlement(today);
      
      // Reload data immediately after generation
      await loadData();
      
      alert('Settlement generated successfully!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate settlement');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settlements</h1>
          <p className="text-muted-foreground mt-1">Track your payouts and settlement schedule</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBankDialog(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Bank Accounts
          </Button>
          <Button onClick={handleGenerateSettlement} className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate Settlement
              </Button>
              <Button 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  window.open(`/api/settlements/generate?date=${today}&format=pdf`, '_blank');
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Settlement</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Settlements</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCompleted)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {settlements.reduce((sum, s) => sum + s.total_transactions, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredSettlements.map((settlement) => (
          <Card key={settlement.id} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {formatCurrency(Number(settlement.total_amount ?? 0))}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3.5 h-3.5" />
                      {settlement.status === 'completed' && settlement.settled_at
                        ? `Completed ${formatDateShort(settlement.settled_at)}`
                        : `Scheduled ${formatDateShort(settlement.settlement_date)}`}
                    </CardDescription>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {settlement.total_transactions} transactions
                      </p>
                      {settlement.utr_number && (
                        <p className="text-sm text-muted-foreground">
                          UTR: {settlement.utr_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(settlement.status) as any} className="flex items-center gap-1">
                    {getStatusIcon(settlement.status)}
                    {settlement.status}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">Net: {formatCurrency(Number(settlement.net_amount ?? 0))}</p>
                    {settlement.fees && Number(settlement.fees) > 0 && (
                      <p className="text-xs text-muted-foreground">Fees: {formatCurrency(Number(settlement.fees))}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {filteredSettlements.length === 0 && !isLoading && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No settlements found</p>
          </CardContent>
        </Card>
      )}

      {/* Bank Accounts Dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 w-5" />
              Bank Accounts
            </DialogTitle>
            <DialogDescription>
              Manage your settlement bank accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bankAccounts.length > 0 ? (
              <div className="grid gap-4">
                {bankAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{account.bankName}</h4>
                          <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                          <p className="text-sm text-muted-foreground">{account.accountHolder}</p>
                          <p className="text-xs text-muted-foreground">IFSC: {account.ifsc}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge variant={account.isDefault ? "default" : "secondary"}>
                            {account.isDefault ? "Default" : "Secondary"}
                          </Badge>
                          <Badge className={
                            account.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }>
                            {account.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bank accounts linked</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add bank accounts in the Banking section to receive settlements
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
