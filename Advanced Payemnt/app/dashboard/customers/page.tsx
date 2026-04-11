'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Users, Mail, CreditCard, Phone, Calendar, DollarSign, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { merchantsApi } from '@/lib/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  transactionCount: number;
  refundedAmount: number;
  successCount: number;
  refundedCount: number;
  lastPayment: string;
  createdAt: string;
}

interface CustomerTransaction {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  orderId: string;
  refundedAmount?: number;
}

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await merchantsApi.getCustomers();
        if (!cancelled) setCustomers(res?.data || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load customers');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
    setIsDetailsLoading(true);
    
    try {
      // Get transactions for this customer
      const res = await merchantsApi.getTransactions();
      const customerTx = res?.data?.filter((tx: any) => 
        tx.customer_email === customer.email
      ).map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        status: tx.status,
        paymentMethod: tx.payment_method,
        createdAt: tx.created_at,
        orderId: tx.order_id || 'N/A'
      })) || [];
      
      setCustomerTransactions(customerTx);
    } catch (e) {
      console.error('Failed to load customer transactions:', e);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">Manage your customer base and view payment history</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{customer.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    {customer.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lifetime Value</span>
                <span className="font-semibold">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">
                  {customer.transactionCount > 0 
                    ? Math.round((customer.successCount / customer.transactionCount) * 100) 
                    : 0}%
                </span>
              </div>
              {customer.refundedCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refunded</span>
                  <span className="font-medium text-red-600">{customer.refundedCount} ({formatCurrency(customer.refundedAmount)})</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Payment</span>
                <span className="font-medium">{formatDate(customer.lastPayment)}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2" 
                onClick={() => handleViewDetails(customer)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && !isLoading && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No customers found matching your search.</p>
          </CardContent>
        </Card>
      )}

      {/* Customer Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Customer Details
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Complete customer information and transaction history
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(selectedCustomer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                  <p className="text-muted-foreground">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedCustomer.phone}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CreditCard className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{selectedCustomer.transactionCount}</p>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-bold">{formatDate(selectedCustomer.lastPayment)}</p>
                    <p className="text-sm text-muted-foreground">Last Payment</p>
                  </CardContent>
                </Card>
                {selectedCustomer.refundedCount > 0 && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <X className="w-6 h-6 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{selectedCustomer.refundedCount}</p>
                      <p className="text-sm text-muted-foreground">Refunded ({formatCurrency(selectedCustomer.refundedAmount)})</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Separator />

              {/* Transaction History */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Transaction History</h4>
                {isDetailsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : customerTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {customerTransactions.map((tx) => (
                      <Card key={tx.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Order ID: {tx.orderId}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(tx.createdAt)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Method: {tx.paymentMethod}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(tx.amount)}</p>
                              <Badge className={getStatusColor(tx.status)}>
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
