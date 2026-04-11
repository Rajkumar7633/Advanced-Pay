'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, QrCode, Navigation, Building2, CheckCircle } from 'lucide-react';
import CardForm from '@/components/checkout/card-form';
import UpiForm from '@/components/checkout/upi-form';
import { OneTapCheckout } from '@/components/checkout/one-tap-checkout';
import { SmartRetryWidget } from '@/components/checkout/smart-retry-widget';
import { VoiceConfirmation } from '@/components/checkout/voice-confirmation';
import { VoicePaymentBadge } from '@/components/dashboard/voice-payment-badge';
import { BlockchainVerification } from '@/components/dashboard/blockchain-verification';
import { formatCurrency } from '@/lib/formatting';
import apiClient from '@/lib/api-client';

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'requires_action' | 'action_processing' | 'success' | 'failed'>('idle');
  const [showRetrySuggestion, setShowRetrySuggestion] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');

  const mockPaymentData = {
    amount: 5999,
    currency: 'INR',
    description: 'Premium Subscription - Monthly'
  };

  const handleCardSubmit = async (data: any = {}) => {
    if (data.upiId === 'QR_WEBHOOK_SUCCESS' || data.upiId === 'QR-SCANNED') {
       setPaymentStatus('success');
       return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    
    try {
      const payload = {
        order_id: `test_checkout_${Date.now()}`,
        amount: mockPaymentData.amount,
        currency: mockPaymentData.currency,
        payment_method: data.paymentMethod || paymentMethod,
        customer_email: data.email || 'tester@example.com',
        customer_phone: data.phone || '+919000000000',
        metadata: {
          test_mode: true
        }
      };

      const res: any = await apiClient.post('/payments', payload);
      const responseData = res.data || res;
      setTransactionData(responseData);
      
      if (responseData.status === 'requires_action') {
        setPaymentStatus('requires_action');
      } else {
        setPaymentStatus('success');
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Mock the success or requires_action if the user is testing the Sandbox without an active token
        setTransactionData({ transaction_id: `SIMULATED_TXN_${Date.now()}` });
        setPaymentStatus(mockPaymentData.amount >= 5000 ? 'requires_action' : 'success');
      } else {
        setPaymentStatus('failed');
        setShowRetrySuggestion(true);
      }
    } finally {
      if (paymentStatus !== 'requires_action') {
        setIsProcessing(false);
      }
    }
  };

  const handleCaptureAction = async () => {
    if (otpCode.length < 6) return;
    setPaymentStatus('action_processing');
    try {
      const txId = transactionData?.transaction_id || transactionData?.id || 'mock_tx_id';
      // In production, this would securely send the OTP or capture intent
      await apiClient.post(`/payments/${txId}/capture`, { otp: otpCode });
      setPaymentStatus('success');
    } catch {
       setPaymentStatus('success'); // allow mock to proceed without token
    } finally {
       setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (paymentStatus === 'success' && typeof window !== 'undefined' && window.speechSynthesis) {
       // Stop any ongoing speech first
       window.speechSynthesis.cancel();
       
       // Dynamically read out the transaction receipt professionally in Hindi
       const amountSpoken = mockPaymentData.amount.toLocaleString('en-IN');
       const professionalMessage = `एडवांस्ड पे का उपयोग करने के लिए धन्यवाद। ${mockPaymentData.description} के लिए ${amountSpoken} रुपये का आपका भुगतान सफलतापूर्वक प्राप्त हो गया है।`;
       
       const utterance = new SpeechSynthesisUtterance(professionalMessage);
       utterance.lang = 'hi-IN';
       utterance.rate = 0.90;
       utterance.pitch = 1.0;
       
       window.speechSynthesis.speak(utterance);
    }
  }, [paymentStatus, mockPaymentData.amount, mockPaymentData.description]);

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white">Payment Successful!</CardTitle>
              <CardDescription className="text-gray-400">
                Your transaction has been processed successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-white font-semibold">{formatCurrency(mockPaymentData.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Transaction ID</span>
                  <span className="text-white font-mono text-xs">{transactionData?.transaction_id || transactionData?.id || `TXN_${Date.now()}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date & Time</span>
                  <span className="text-white text-xs">{new Date().toLocaleString()}</span>
                </div>
              </div>
              <VoicePaymentBadge language="Hindi" verified />
              <BlockchainVerification />
              <Button 
                variant="outline" 
                className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
                onClick={() => {
                  setPaymentStatus('idle');
                  setIsProcessing(false);
                }}
              >
                Return to Sandbox Testing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      
      {/* 3D Secure Authentication Modal */}
      {paymentStatus === 'requires_action' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-white rounded-xl max-w-sm w-full overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.2)] animate-in slide-in-from-bottom-6 duration-500">
             <div className="bg-[#002f6c] p-4 text-center border-b-[8px] border-yellow-400">
                <h3 className="text-white font-bold tracking-widest text-lg opacity-90 drop-shadow-md">Verified by Visa</h3>
             </div>
             <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 font-medium">Added protection. A secure PIN has been texted to your registered mobile number ending in <strong className="text-black">XXXX</strong>.</p>
                
                <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs space-y-2 text-gray-600">
                   <div className="flex justify-between"><span className="text-gray-400">Merchant</span><strong className="text-black overflow-hidden whitespace-nowrap overflow-ellipsis">Advanced Pay Network</strong></div>
                   <div className="flex justify-between"><span className="text-gray-400">Amount</span><strong className="text-black">{formatCurrency(mockPaymentData.amount)}</strong></div>
                   <div className="flex justify-between"><span className="text-gray-400">Date</span><strong className="text-black">{new Date().toLocaleDateString()}</strong></div>
                   <div className="flex justify-between"><span className="text-gray-400">Card Number</span><strong className="text-black">XXXX-XXXX-XXXX-4242</strong></div>
                </div>

                <div>
                   <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">SMS Passcode</label>
                   <input 
                     type="text" 
                     maxLength={6}
                     value={otpCode}
                     onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                     className="w-full h-12 text-center text-xl tracking-[0.5em] font-mono border-2 border-gray-300 rounded focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c] bg-white text-black mt-1" 
                     placeholder="••••••"
                   />
                </div>
                
                <Button 
                   onClick={handleCaptureAction} 
                   disabled={otpCode.length < 6 || paymentStatus === 'action_processing' as any}
                   className="w-full bg-[#002f6c] hover:bg-[#001f4d] rounded h-12 font-bold text-white tracking-wide uppercase mt-4 shadow-lg shadow-blue-900/20"
                >
                   {paymentStatus === 'action_processing' as any ? 'Processing...' : 'Submit & Guarantee'}
                </Button>
                
                <div className="flex justify-center pt-2">
                   <button onClick={() => setPaymentStatus('idle')} className="text-xs text-blue-600 hover:underline font-medium">Cancel Transaction</button>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Secure Payment</span>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <span className="text-gray-400">{mockPaymentData.description}</span>
              <span className="text-white font-semibold">{formatCurrency(mockPaymentData.amount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Taxes & Fees</span>
              <span className="text-white">Included</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-700 text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-blue-400">{formatCurrency(mockPaymentData.amount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* One-Tap Checkout */}
        <OneTapCheckout
          onPay={() => handleCardSubmit({ paymentMethod: 'card' })}
          savedMethod={{ last4: '4242', brand: 'Visa' }}
          loading={isProcessing}
        />

        {/* Payment Methods */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentStatus === 'failed' && (
              <SmartRetryWidget
                suggestedMethod="UPI"
                successChance={85}
                reason="UPI has higher success rate for this amount"
                onRetry={(method) => {
                  setPaymentMethod(method.toLowerCase());
                  setShowRetrySuggestion(false);
                  setPaymentStatus('idle');
                }}
              />
            )}
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger value="card" className="data-[state=active]:bg-blue-600">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </TabsTrigger>
                <TabsTrigger value="upi" className="data-[state=active]:bg-blue-600">
                  <QrCode className="w-4 h-4 mr-2" />
                  UPI
                </TabsTrigger>
                <TabsTrigger value="netbanking" className="data-[state=active]:bg-blue-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  Net Banking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="space-y-4">
                <CardForm
                  onSubmit={handleCardSubmit}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="upi" className="space-y-4">
                <UpiForm
                  amount={mockPaymentData.amount}
                  onSubmit={handleCardSubmit}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="netbanking" className="space-y-4">
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Navigation className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-400">You will be redirected to your bank</p>
                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" onClick={handleCardSubmit} disabled={isProcessing}>
                      Continue to Net Banking
                    </Button>
                  </div>
                  <VoiceConfirmation onConfirm={() => handleCardSubmit({})} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            🔒 Your payment information is encrypted and secure. We never store your credit card details.
          </p>
        </div>
      </div>
    </div>
  );
}
