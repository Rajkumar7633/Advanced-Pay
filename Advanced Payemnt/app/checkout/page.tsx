'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, QrCode, Navigation, Building2, CheckCircle, Bitcoin } from 'lucide-react';
import CardForm from '@/components/checkout/card-form';
import UpiForm from '@/components/checkout/upi-form';
import { OneTapCheckout } from '@/components/checkout/one-tap-checkout';
import { SmartRetryWidget } from '@/components/checkout/smart-retry-widget';
import { VoiceConfirmation } from '@/components/checkout/voice-confirmation';
import { VoicePaymentBadge } from '@/components/dashboard/voice-payment-badge';
import { BlockchainVerification } from '@/components/dashboard/blockchain-verification';
import { CryptoPayment } from '@/components/checkout/crypto-payment';
import { OrderSummaryFX } from '@/components/checkout/order-summary-fx';
import { ApplePayOverlay } from '@/components/checkout/apple-pay-overlay';
import { ReceiptPrinter } from '@/components/checkout/receipt-printer';
import { formatCurrency } from '@/lib/formatting';
import apiClient from '@/lib/api-client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentMethodUrl = searchParams?.get('method') || 'card';
  
  const [paymentMethod, setPaymentMethod] = useState(paymentMethodUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'requires_action' | 'action_processing' | 'success' | 'failed'>('idle');
  const [showRetrySuggestion, setShowRetrySuggestion] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');
  
  // Book Animation State
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Interactive Sandbox Data
  const [mockPaymentData, setMockPaymentData] = useState({
    amount: searchParams?.get('amount') ? parseInt(searchParams.get('amount') as string, 10) : 0,
    currency: searchParams?.get('currency') || 'INR',
    description: searchParams?.get('desc') || 'Custom Checkout Order'
  });

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
    if (paymentStatus === 'success' && typeof window !== 'undefined') {
       if (window.speechSynthesis) {
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
       
       // Redirect to final done route
       router.push(`/checkout/done?amount=${mockPaymentData.amount}&currency=${mockPaymentData.currency}&desc=${encodeURIComponent(mockPaymentData.description)}`);
    }
  }, [paymentStatus, mockPaymentData.amount, mockPaymentData.description, mockPaymentData.currency, router]);

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

      <div className="w-full max-w-[1100px] relative perspective-[3000px] group py-10">
        
        {/* Background Aura */}
        <div className="absolute inset-0 bg-blue-500/10 blur-[120px] rounded-[100%] transition-opacity duration-1000 group-hover:bg-blue-400/20 pointer-events-none -z-10" />

        {/* The Physical Book Wrapper */}
        <div className={`w-full flex relative transform-gpu transition-transform duration-1000 ${isBookOpen ? 'rotate-x-[0deg] rotate-y-[0deg] z-20' : 'preserve-3d rotate-x-[5deg] rotate-y-[5deg] translate-x-1/4'}`}>
          
          {/* LEFT PAGE */}
          <div className={`flex-1 bg-gradient-to-br from-[#0B1120] to-[#111827] shadow-[30px_0_50px_-20px_rgba(0,0,0,0.8)] border border-slate-700/50 rounded-l-[2rem] p-8 space-y-6 transform-gpu origin-right transition-transform duration-700 relative overflow-hidden pt-12 ${isBookOpen ? 'rotate-y-0' : 'rotate-y-[4deg]'}`}>
            
            {/* Page Glare */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 pointer-events-none" />

            {/* Logo */}
            <div className="text-center mb-10 space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold tracking-wide text-blue-300">Secure Payment</span>
              </div>
              <div className="pt-2">
                <Link
                  href="/checkout/advanced"
                  className="text-xs font-semibold text-cyan-300/80 hover:text-cyan-300 underline-offset-4 hover:underline transition-colors"
                >
                  Try advanced checkout — your rails, India + cross-border
                </Link>
              </div>
            </div>

        {/* Grand Finale FX Order Summary */}
        <OrderSummaryFX 
           baseAmount={mockPaymentData.amount}
           baseDesc={mockPaymentData.description}
           onAmountChange={(val) => setMockPaymentData(p => ({...p, amount: val}))}
           onDescChange={(desc) => setMockPaymentData(p => ({...p, description: desc}))}
           onCurrencyChange={(curr, activeAmount) => {
               setMockPaymentData(p => ({...p, currency: curr}));
           }}
        />

        {/* The Native SDK Mock Suite */}
        <ApplePayOverlay 
           amount={mockPaymentData.amount}
           currencySymbol={mockPaymentData.currency === 'USD' ? '$' : mockPaymentData.currency === 'EUR' ? '€' : mockPaymentData.currency === 'GBP' ? '£' : '₹'}
           onSuccess={() => setPaymentStatus('success')}
        />

          {/* One-Tap Checkout */}
          <div className="relative z-10">
             <OneTapCheckout
               onPay={() => handleCardSubmit({ paymentMethod: 'card' })}
               savedMethod={{ last4: '4242', brand: 'Visa' }}
               loading={isProcessing}
             />
          </div>
        </div>

        {/* BOOK SPINE (The Crease) */}
        <div className="w-6 shrink-0 bg-gradient-to-r from-black/90 via-slate-800/10 to-white/5 relative z-20 shadow-[inset_0_0_30px_rgba(0,0,0,1)] flex flex-col justify-between py-8">
           {/* Stitching or binder marks could go here */}
           <div className="w-full h-px bg-white/5" />
           <div className="w-full h-px bg-white/5" />
           <div className="w-full h-px bg-white/5" />
        </div>

        {/* RIGHT PAGE */}
        <div 
           className={`flex-1 bg-gradient-to-bl from-[#0f1523] to-[#161f33] shadow-[-30px_0_50px_-20px_rgba(0,0,0,0.8)] border-y border-r border-slate-700/50 rounded-r-[2rem] transform-gpu origin-left transition-all duration-[1500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] relative ${isBookOpen ? 'rotate-y-[0deg]' : 'preserve-3d -rotate-y-[179.9deg] z-50 translate-z-[30px] cursor-pointer hover:scale-[1.01]'}`}
           onClick={() => { if (!isBookOpen) setIsBookOpen(true); }}
        >
          
          {/* THE BOOK COVER (Visible only when closed. It sits on the 'back' of the right page, so we rotate it 180 to face forward when the page is swung shut) */}
          <div className={`absolute inset-0 bg-gradient-to-l from-blue-900 via-[#0a1128] to-[#040814] rounded-l-[2rem] border border-blue-500/40 flex flex-col items-center justify-center backface-hidden transform rotate-y-180 shadow-[inset_20px_0_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-1000 ${isBookOpen ? 'opacity-0 -z-10 pointer-events-none' : 'opacity-100 z-50'}`}>
             <div className="w-full h-full absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
             <div className="w-20 h-20 bg-blue-600/20 flex items-center justify-center rounded-full mb-8 shadow-[0_0_50px_rgba(37,99,235,0.4)] animate-bounce relative group pointer-events-none">
                <CreditCard className="w-10 h-10 text-blue-400" />
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping pointer-events-none" />
             </div>
             <h2 className="text-4xl font-black text-white tracking-[0.2em] uppercase pb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 pointer-events-none">
               Checkout
             </h2>
             <p className="text-blue-400 tracking-[0.3em] font-medium text-sm mt-2 uppercase pointer-events-none">
               For Payment
             </p>
             <div className="mt-16 w-48 h-12 bg-white/10 rounded-full overflow-hidden flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors pointer-events-none">
                <span className="text-xs font-bold text-white tracking-[0.3em] uppercase pointer-events-none">Click to Open</span>
             </div>
          </div>

          {/* THE INSIDE OF THE RIGHT PAGE (Visible when Open) */}
          <div className="absolute inset-0 p-8 pt-12 space-y-6 backface-hidden overflow-y-auto overflow-x-hidden stylized-scrollbar">
            {/* Page Glare */}
            <div className="absolute inset-0 bg-gradient-to-tl from-white/0 via-white/[0.02] to-white/0 pointer-events-none" />

            {/* Payment Methods */}
            <div className="relative z-10 block">
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
                    <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                      <TabsTrigger value="card" className="data-[state=active]:bg-blue-600">
                        <CreditCard className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Card</span>
                      </TabsTrigger>
                      <TabsTrigger value="upi" className="data-[state=active]:bg-blue-600">
                        <QrCode className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">UPI</span>
                      </TabsTrigger>
                      <TabsTrigger value="crypto" className="data-[state=active]:bg-orange-500 hover:text-orange-300">
                        <Bitcoin className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Web3</span>
                      </TabsTrigger>
                      <TabsTrigger value="netbanking" className="data-[state=active]:bg-blue-600">
                        <Building2 className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Net Bank</span>
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

                    <TabsContent value="crypto" className="space-y-4">
                       <CryptoPayment amount={mockPaymentData.amount / 80} />
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
              <div className="bg-[#0b101a] border border-blue-500/20 rounded-xl p-5 shadow-xl relative z-10 mt-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                <p className="text-sm text-blue-300 font-medium leading-relaxed relative z-10 flex items-start gap-3">
                  <span className="text-xl">🔒</span> 
                  Your payment information is mathematically encrypted and highly secure. We process your transaction securely without storing vulnerable details.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Close The Physical Book Wrapper */}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .preserve-3d { transform-style: preserve-3d; opacity: 1 !important; visibility: visible !important; }
          .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
          .perspective-\\[3000px\\] { perspective: 3000px; }
          .rotate-x-\\[2deg\\] { transform: rotateX(2deg); }
          .-rotate-y-\\[1deg\\] { transform: rotateY(-1deg); }
          .rotate-x-0 { transform: rotateX(0deg); }
          .rotate-y-0 { transform: rotateY(0deg); }
          .rotate-y-\\[4deg\\] { transform: rotateY(4deg); }
          .-rotate-y-\\[4deg\\] { transform: rotateY(-4deg); }
          .-rotate-y-\\[179.9deg\\] { transform: rotateY(-179.9deg); }
          .rotate-y-\\[3deg\\] { transform: rotateY(3deg); }
          .-rotate-y-\\[3deg\\] { transform: rotateY(-3deg); }
          .rotate-y-\\[1deg\\] { transform: rotateY(1deg); }
          .translate-z-\\[30px\\] { transform: translateZ(30px) rotateY(-179.9deg) !important; }
          
          .stylized-scrollbar::-webkit-scrollbar {
             width: 6px;
          }
          .stylized-scrollbar::-webkit-scrollbar-track {
             background: transparent;
          }
          .stylized-scrollbar::-webkit-scrollbar-thumb {
             background: #1e293b;
             border-radius: 10px;
          }
        `}} />
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
       </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
