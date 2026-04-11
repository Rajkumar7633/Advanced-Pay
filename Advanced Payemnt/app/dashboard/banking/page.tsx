'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, 
  TrendingUp, 
  Banknote, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Building,
  CreditCard,
  Smartphone,
  Plus
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { merchantsApi } from '@/lib/api';

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

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  bankAccount: string;
  createdAt: string;
  processedAt?: string;
  utr?: string;
  failureReason?: string;
}

interface MerchantBalance {
  availableBalance: number;
  pendingSettlements: number;
  totalRevenue: number;
  lastSettlement: string;
}

export default function BankingPage() {
  const [balance, setBalance] = useState<MerchantBalance | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Withdrawal form state
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // Add bank account state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    ifsc: '',
    accountType: 'savings'
  });

  useEffect(() => {
    loadBankingData();
  }, []);

  const loadBankingData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Load balance from API
      const balanceRes = await merchantsApi.getBalance();
      setBalance(balanceRes?.data);

      // Load bank accounts from API
      const accountsRes = await merchantsApi.getBankAccounts();
      setBankAccounts(accountsRes?.data || []);

      // Load withdrawals from API
      const withdrawalsRes = await merchantsApi.getWithdrawals();
      setWithdrawals(withdrawalsRes?.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load banking data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !selectedBankAccount) {
      setError('Please enter withdrawal amount and select bank account');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!balance || amount > balance.availableBalance) {
      setError('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      // Create withdrawal request via API
      const res = await merchantsApi.requestWithdrawal({
        amount,
        bankAccountId: selectedBankAccount
      });

      const newWithdrawal = res?.data;
      if (newWithdrawal) {
        setWithdrawals([newWithdrawal, ...withdrawals]);
        setBalance(prev => prev ? {
          ...prev,
          availableBalance: prev.availableBalance - amount,
          pendingSettlements: prev.pendingSettlements + amount
        } : null);
      }

      setWithdrawalAmount('');
      setSelectedBankAccount('');
      
      // Show success message
      alert('Withdrawal request submitted successfully!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!newAccount.bankName || !newAccount.accountNumber || !newAccount.accountHolder || !newAccount.ifsc) {
      setError('Please fill all bank account details');
      return;
    }

    try {
      // Add bank account via API
      const res = await merchantsApi.addBankAccount(newAccount);
      const account = res?.data;

      if (account) {
        setBankAccounts([...bankAccounts, account]);
      }

      setNewAccount({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        ifsc: '',
        accountType: 'savings'
      });
      setShowAddAccount(false);
      
      alert('Bank account added successfully!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add bank account');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Banking & Withdrawals</h1>
        <p className="text-muted-foreground mt-1">Manage your bank accounts and withdraw funds</p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Balance Overview */}
      {balance && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(balance.availableBalance)}</p>
                </div>
                <Wallet className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Settlements</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(balance.pendingSettlements)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(balance.totalRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Settlement</p>
                  <p className="text-sm font-bold">{formatDate(balance.lastSettlement)}</p>
                </div>
                <Banknote className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Withdrawal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5" />
              Request Withdrawal
            </CardTitle>
            <CardDescription>
              Withdraw funds to your linked bank account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
              />
              {balance && (
                <p className="text-sm text-muted-foreground">
                  Available: {formatCurrency(balance.availableBalance)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account</Label>
              {bankAccounts.length > 0 ? (
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bankName} - {account.accountNumber}
                        {account.isDefault && <Badge className="ml-2" variant="secondary">Default</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-4 border rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground mb-2">No bank accounts available</p>
                  <Button variant="outline" size="sm" onClick={() => setShowAddAccount(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bank Account
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleWithdrawal} 
                disabled={isWithdrawing || !balance || parseFloat(withdrawalAmount) > balance.availableBalance || bankAccounts.length === 0}
                className="flex-1"
              >
                {isWithdrawing ? 'Processing...' : bankAccounts.length === 0 ? 'Add Bank Account First' : 'Request Withdrawal'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddAccount(true)}
              >
                {bankAccounts.length === 0 ? 'Add Account' : 'Add Account'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Withdrawals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Recent Withdrawals
            </CardTitle>
            <CardDescription>
              Track your withdrawal requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(withdrawal.amount)}</span>
                        <Badge className={getStatusColor(withdrawal.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(withdrawal.status)}
                            {withdrawal.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{withdrawal.bankAccount}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(withdrawal.createdAt)}</p>
                      {withdrawal.utr && (
                        <p className="text-xs text-muted-foreground">UTR: {withdrawal.utr}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No withdrawals yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Bank Accounts
          </CardTitle>
          <CardDescription>
            Manage your linked bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bankAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
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
                        <Badge className={getStatusColor(account.status)}>
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
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bank Accounts Linked</h3>
              <p className="text-muted-foreground mb-4">
                Add a bank account to withdraw your earnings
              </p>
              <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
                <h4 className="font-medium mb-2">How to add a bank account:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click the "Add Account" button below</li>
                  <li>Enter your bank details (name, account number, IFSC)</li>
                  <li>Submit to start receiving withdrawals</li>
                </ol>
              </div>
              <Button onClick={() => {
                console.log('Add Account button clicked');
                setShowAddAccount(true);
              }} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Bank Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bank Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={(open) => {
        console.log('Dialog open changed:', open);
        setShowAddAccount(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Link a new bank account for withdrawals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g., State Bank of India"
                value={newAccount.bankName}
                onChange={(e) => setNewAccount({...newAccount, bankName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number"
                value={newAccount.accountNumber}
                onChange={(e) => setNewAccount({...newAccount, accountNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountHolder">Account Holder Name</Label>
              <Input
                id="accountHolder"
                placeholder="Enter account holder name"
                value={newAccount.accountHolder}
                onChange={(e) => setNewAccount({...newAccount, accountHolder: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input
                id="ifsc"
                placeholder="e.g., SBIN0001234"
                value={newAccount.ifsc}
                onChange={(e) => setNewAccount({...newAccount, ifsc: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={newAccount.accountType} onValueChange={(value) => setNewAccount({...newAccount, accountType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddBankAccount} className="flex-1">
                Add Account
              </Button>
              <Button variant="outline" onClick={() => setShowAddAccount(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
