'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, X } from 'lucide-react';

export default function EmbeddedCheckout() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session');
  const publishableKey = searchParams.get('pk');

  const [status, setStatus] = useState<'loading' | 'intent_ready' | 'processing' | 'success' | 'error'>('loading');
  const [intentData, setIntentData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (!sessionToken || !publishableKey) {
      setStatus('error');
      setErrorMessage('Invalid session configuration.');
      return;
    }

    // In a real environment, we'd fetch the exact order value linked to the sessionToken.
    // For this drop-in UI demonstration, we'll mock an intent resolution.
    setTimeout(() => {
      setIntentData({
        amount: 2999.00,
        currency: 'INR',
        merchant_name: 'Premium Store India',
        order_id: 'ord_' + Math.floor(Math.random() * 1000000)
      });
      setStatus('intent_ready');
    }, 800);

  }, [sessionToken, publishableKey]);

  const handleClose = () => {
    window.parent.postMessage({
      source: 'advancedpay-sdk',
      type: 'CLOSE_CHECKOUT',
      payload: null
    }, '*');
  };

  const handlePay = () => {
    setStatus('processing');
    
    // Simulate robust backend routing and payment attempt.
    setTimeout(() => {
      // 90% success rate for realistic demo
      if (Math.random() > 0.1) {
        setStatus('success');
        setTimeout(() => {
          window.parent.postMessage({
            source: 'advancedpay-sdk',
            type: 'PAYMENT_SUCCESS',
            payload: {
              transaction_id: 'txn_' + Date.now(),
              status: 'captured',
              amount: intentData?.amount,
              order_id: intentData?.order_id
            }
          }, '*');
        }, 1500); // give user time to see success badge before closing frame auto
      } else {
        setStatus('error');
        setErrorMessage('Payment declined by issuer bank. Please try another method.');
        window.parent.postMessage({
          source: 'advancedpay-sdk',
          type: 'PAYMENT_ERROR',
          payload: { error: 'Bank declined', code: 'err_issuer_decline' }
        }, '*');
      }
    }, 2000);
  };

  if (status === 'success') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white/70 backdrop-blur-3xl animate-in fade-in duration-500">
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Payment Successful!</h2>
        <p className="text-muted-foreground mt-2">Redirecting back to merchant...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-50">
        <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full bg-gray-100 hover:bg-gray-200">
          <X className="w-5 h-5 text-gray-600" />
        </Button>
      </div>

      <Card className="w-full h-full border-0 rounded-none shadow-none flex flex-col">
        <CardHeader className="bg-gray-50 border-b pb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-lg text-primary tracking-tight">AdvancedPay</span>
            <span className="flex items-center text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full"><Lock className="w-3 h-3 mr-1"/> PCI Secured</span>
          </div>
          <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">PAYING</CardTitle>
          {status === 'loading' ? (
             <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="flex flex-col mt-1">
              <span className="text-3xl font-black tabular-nums">
                ₹{intentData?.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-sm font-medium text-muted-foreground truncate">{intentData?.merchant_name} (Order: {intentData?.order_id})</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6 flex-grow overflow-y-auto">
          {status === 'error' && errorMessage && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm font-medium">
               <AlertCircle className="w-5 h-5 shrink-0" />
               <p>{errorMessage}</p>
            </div>
          )}

          {status === 'loading' ? (
             <div className="space-y-4 w-full">
               <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
               <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
                 <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
               </div>
             </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-100/50 p-1.5 rounded-xl inline-flex w-full">
                <button 
                  onClick={() => setPaymentMethod('card')} 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${paymentMethod === 'card' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Credit / Debit Card
                </button>
                <button 
                  onClick={() => setPaymentMethod('upi')} 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${paymentMethod === 'upi' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  UPI ID
                </button>
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="card">Card Number</Label>
                    <Input 
                      id="card" 
                      placeholder="0000 0000 0000 0000" 
                      className="font-mono" 
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                      <Input 
                        id="expiry" 
                        placeholder="MM/YY" 
                        className="font-mono text-center" 
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input 
                        id="cvv" 
                        placeholder="123" 
                        type="password" 
                        className="font-mono text-center" 
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="space-y-2">
                     <Label htmlFor="upi">Virtual Payment Address (VPA)</Label>
                     <Input 
                       id="upi" 
                       placeholder="yourname@upi" 
                       className="font-mono focus:border-green-500 focus:ring-green-500" 
                       value={upiId}
                       onChange={(e) => setUpiId(e.target.value)}
                     />
                   </div>
                   <div className="text-xs text-muted-foreground text-center mt-4">
                     You will receive a collect request on your UPI app to complete this payment.
                   </div>
                 </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-gray-50 border-t p-6 flex-shrink-0">
          <Button 
            className="w-full font-bold text-base h-12 shadow-md relative overflow-hidden transition-all hover:scale-[1.02]" 
            disabled={status === 'loading' || status === 'processing' || (paymentMethod === 'card' ? (!cardNumber || !expiry || !cvv) : !upiId)}
            onClick={handlePay}
          >
             {status === 'processing' ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing securely...
                </div>
             ) : (
                `Pay ₹${intentData?.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}`
             )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
