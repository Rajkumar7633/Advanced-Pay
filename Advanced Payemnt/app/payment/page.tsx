'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Smartphone, 
  Fingerprint, 
  Banknote, 
  QrCode,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  X
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { merchantsApi } from '@/lib/api';
import { OneTapCheckout } from '@/components/checkout/one-tap-checkout';
import { Heart } from 'lucide-react';



interface PaymentPageProps {
  paymentLinkId?: string;
  amount?: number;
  merchantId?: string;
}

interface PaymentLink {
  id: string;
  amount: number;
  description?: string;
  currency: string;
  status: string;
  link: string;
  created_at: string;
}

interface PaymentMethods {
  cards: boolean;
  upi: boolean;
  netbanking: boolean;
  wallet: boolean;
  fingerprint: boolean;
  qr: boolean;
}

export default function PaymentPage({ paymentLinkId, amount: defaultAmount, merchantId }: PaymentPageProps) {
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    cards: true,
    upi: true,
    netbanking: true,
    wallet: false,
    fingerprint: true,
    qr: true
  });
  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState<string>('');
  const [amount, setAmount] = useState<number>(defaultAmount || 0);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [error, setError] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  // Load payment link data if paymentLinkId is provided
  useEffect(() => {
    if (paymentLinkId) {
      loadPaymentLink();
    }
  }, [paymentLinkId]);

  const loadPaymentLink = async () => {
    try {
      const res = await merchantsApi.getPaymentLink(paymentLinkId!);
      if (res?.data) {
        setPaymentLink(res.data);
        setAmount(res.data.amount);
      }
    } catch (e) {
      console.error('Failed to load payment link:', e);
      setError('Payment link not found');
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const createPayment = async (paymentMethod: string, paymentData: any) => {
    setIsLoading(true);
    setError('');
    setPaymentStatus('processing');

    try {
      const paymentRequest = {
        order_id: `order_${Date.now()}`,
        amount: amount,
        currency: 'INR',
        payment_method: paymentMethod,
        customer_email: customerEmail || 'guest@example.com',
        customer_phone: customerPhone || '+910000000000',
        ...paymentData
      };

      const res = await merchantsApi.createPayment(paymentRequest);
      
      if (res?.data) {
        setTransactionId(res.data.id);
        
        // For demo purposes, simulate payment processing
        setTimeout(() => {
          setPaymentStatus('success');
        }, 2000);
        
        return res.data;
      }
    } catch (e) {
      setPaymentStatus('failed');
      setError(e instanceof Error ? e.message : 'Payment failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardExpiry || !cardCvv) {
      setError('Please fill all card details');
      return;
    }

    await createPayment('card', {
      card_number: cardNumber.replace(/\s/g, ''),
      card_expiry: cardExpiry,
      card_cvv: cardCvv
    });
  };

  const handleUpiPayment = async () => {
    if (!upiId) {
      setError('Please enter UPI ID');
      return;
    }

    await createPayment('upi', {
      upi_id: upiId
    });
  };

  const handleFingerprintPayment = async () => {
    // Simulate fingerprint authentication
    if (!window.navigator.credentials) {
      setError('Fingerprint not supported on this device');
      return;
    }

    try {
      // Simulate biometric authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      await createPayment('fingerprint', {
        biometric_token: 'simulated_fingerprint_token'
      });
    } catch (e) {
      setError('Fingerprint authentication failed');
    }
  };

  const handleNetbankingPayment = async () => {
    if (!selectedBank) {
      setError('Please select a bank');
      return;
    }

    await createPayment('netbanking', {
      bank_code: selectedBank
    });
  };

  const renderPaymentSuccess = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
      <p className="text-muted-foreground mb-4">Your payment has been processed successfully</p>
      <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto">
        <p className="text-sm text-muted-foreground">Transaction ID</p>
        <p className="font-mono text-sm">{transactionId}</p>
        <p className="text-sm text-muted-foreground mt-2">Amount Paid</p>
        <p className="text-xl font-bold">{formatCurrency(amount)}</p>
      </div>
      <Button 
        className="mt-6" 
        onClick={() => window.location.href = '/dashboard'}
      >
        Back to Dashboard
      </Button>
    </div>
  );

  const renderPaymentFailed = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
      <p className="text-muted-foreground mb-4">{error || 'Something went wrong'}</p>
      <Button 
        variant="outline" 
        onClick={() => setPaymentStatus('idle')}
      >
        Try Again
      </Button>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h2 className="text-2xl font-bold text-blue-600 mb-2">Processing Payment</h2>
      <p className="text-muted-foreground">Please wait while we process your payment...</p>
    </div>
  );

  if (paymentStatus === 'success') return renderPaymentSuccess();
  if (paymentStatus === 'failed') return renderPaymentFailed();
  if (paymentStatus === 'processing') return renderProcessing();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Close Button */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>

        {/* Payment Header */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl">Secure Payment</CardTitle>
            <CardDescription>
              {paymentLink?.description || 'Complete your payment securely'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(amount)}
            </div>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Secure 256-bit encryption
            </Badge>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
              <TabsList className="grid w-full grid-cols-2 gap-2">
                {paymentMethods.cards && (
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card
                  </TabsTrigger>
                )}
                {paymentMethods.fingerprint && (
                  <TabsTrigger value="fingerprint" className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" />
                    Biometric
                  </TabsTrigger>
                )}
                {paymentMethods.upi && (
                  <TabsTrigger value="upi" className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    UPI
                  </TabsTrigger>
                )}
                {paymentMethods.qr && (
                  <TabsTrigger value="qr" className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </TabsTrigger>
                )}
                {paymentMethods.netbanking && (
                  <TabsTrigger value="netbanking" className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Net Banking
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="card" className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Card Number</label>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiry</label>
                    <Input
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CVV</label>
                    <Input
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={3}
                      type="password"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCardPayment}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
                </Button>
              </TabsContent>

              <TabsContent value="fingerprint" className="space-y-4 mt-6">
                <OneTapCheckout 
                  loading={isLoading}
                  onPay={async () => {
                    await createPayment('fingerprint', { biometric_token: 'otc_auth_token' });
                  }}
                  savedMethod={{ last4: '4242', brand: 'Visa' }}
                />
              </TabsContent>

              <TabsContent value="upi" className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">UPI ID</label>
                  <Input
                    placeholder="username@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleUpiPayment}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
                </Button>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4 mt-6">
                <div className="text-center py-8">
                  <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">QR Code for Payment</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Scan to Pay</h3>
                  <p className="text-muted-foreground mb-6">
                    Scan this QR code with any payment app to complete the payment
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowQRCode(!showQRCode)}
                    >
                      {showQRCode ? 'Hide QR' : 'Show QR'}
                    </Button>
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Payment link copied!');
                      }}
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="netbanking" className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Bank</label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                  >
                    <option value="">Choose your bank</option>
                    <option value="SBIN">State Bank of India</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICIC">ICICI Bank</option>
                    <option value="UTIB">Axis Bank</option>
                    <option value="PUNB">Punjab National Bank</option>
                  </select>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleNetbankingPayment}
                  disabled={isLoading}
                >
                  {isLoading ? 'Redirecting...' : `Pay ${formatCurrency(amount)}`}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security & Made in India Badge */}
        <div className="text-center mt-6 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            Secured by industry-standard 256-bit AES encryption
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> in India
          </div>
        </div>

        {/* Floating QR Code Card */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment QR Code</CardTitle>
                  <CardDescription>Scan to complete payment</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowQRCode(false)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">QR Code for Payment</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Amount: <span className="font-semibold">{formatCurrency(amount)}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Payment link copied!');
                      }}
                    >
                      Copy Link
                    </Button>
                    <Button variant="destructive" onClick={() => setShowQRCode(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Click outside to close */}
            <div 
              className="absolute inset-0 -z-10" 
              onClick={() => setShowQRCode(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
