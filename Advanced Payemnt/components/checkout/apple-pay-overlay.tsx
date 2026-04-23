'use client';

import { useState, useEffect } from 'react';
import { Apple, Smartphone, CheckCircle2, ChevronRight, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApplePayOverlayProps {
  amount: number;
  currencySymbol: string;
  onSuccess: () => void;
}

export function ApplePayOverlay({ amount, currencySymbol, onSuccess }: ApplePayOverlayProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [paymentState, setPaymentState] = useState<'idle' | 'authorizing' | 'faceid' | 'success'>('idle');

  useEffect(() => {
     let timer: NodeJS.Timeout;
     if (paymentState === 'authorizing') {
       timer = setTimeout(() => setPaymentState('faceid'), 800);
     } else if (paymentState === 'faceid') {
       timer = setTimeout(() => {
          setPaymentState('success');
          setTimeout(() => {
             setShowSheet(false);
             onSuccess();
          }, 1500);
       }, 2000);
     }
     return () => clearTimeout(timer);
  }, [paymentState, onSuccess]);

  const handleTrigger = () => {
    setShowSheet(true);
    setPaymentState('idle');
  };

  const handleDoubleClick = () => {
    if (paymentState === 'idle') {
      setPaymentState('authorizing');
    }
  };

  return (
    <>
      {/* Trigger Buttons */}
      <div className="w-full space-y-3 mb-6 relative z-10">
        <Button 
           onClick={handleTrigger}
           className="w-full h-12 bg-black hover:bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center shadow-lg transition-transform hover:scale-[1.02]"
        >
           <Apple className="w-5 h-5 mr-1" fill="white" /> Pay
        </Button>
        <Button 
           onClick={handleTrigger}
           className="w-full h-12 bg-white hover:bg-gray-100 text-slate-800 border border-slate-200 rounded-xl font-bold flex items-center justify-center shadow-md transition-transform hover:scale-[1.02]"
        >
           Google Pay
        </Button>
        <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-slate-700 flex-1" />
            <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">Or</span>
            <div className="h-px bg-slate-700 flex-1" />
        </div>
      </div>

      {/* The Apple Pay Slide-up Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => paymentState === 'idle' && setShowSheet(false)} />
          
          <div className="w-full max-w-sm mx-auto bg-white rounded-t-[32px] relative z-20 pb-10 pt-4 px-6 animate-in slide-in-from-bottom-full duration-300">
             
             {/* Notch Line */}
             <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />

             {/* Dynamic State Engine */}
             {paymentState === 'idle' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="text-xl font-medium tracking-tight text-black">Advanced Pay</span>
                     <span className="text-2xl font-semibold text-black">{currencySymbol}{amount.toFixed(2)}</span>
                  </div>
                  
                  <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-between cursor-pointer active:bg-gray-200">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center shadow-sm">
                           <span className="text-white text-[10px] font-black italic">VISA</span>
                        </div>
                        <span className="text-sm font-medium text-black">•••• 4242</span>
                     </div>
                     <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex flex-col items-center justify-center pt-8 space-y-4">
                     <div className="w-12 h-24 bg-gray-200 rounded-full flex flex-col justify-between p-1 border-4 border-white shadow-[0_0_15px_rgba(0,0,0,0.1)] relative cursor-pointer" onClick={handleDoubleClick}>
                        <div className="w-full h-10 bg-black rounded-full" />
                        <div className="w-full h-10 bg-transparent" />
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-4 h-12 bg-blue-500 rounded-r-lg animate-pulse" />
                     </div>
                     <p className="text-sm font-medium text-black">Double Click to Pay</p>
                  </div>
                </div>
             )}

             {(paymentState === 'authorizing' || paymentState === 'faceid') && (
                <div className="min-h-[250px] flex flex-col items-center justify-center space-y-6">
                   <div className="relative">
                      <Fingerprint className="w-16 h-16 text-blue-500 animate-pulse" strokeWidth={1} />
                      {paymentState === 'faceid' && (
                         <div className="absolute inset-0 bg-blue-500/20 rounded-full flex items-center justify-center animate-[ping_1s_ease-out_infinite]" />
                      )}
                   </div>
                   <p className="text-lg font-medium text-black tracking-tight font-mono">
                     {paymentState === 'authorizing' ? 'Processing...' : 'Face ID Verified'}
                   </p>
                </div>
             )}

             {paymentState === 'success' && (
                <div className="min-h-[250px] flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-300">
                   <CheckCircle2 className="w-20 h-20 text-black" strokeWidth={1.5} />
                   <p className="text-xl font-medium text-black tracking-tight">Done</p>
                </div>
             )}

          </div>
        </div>
      )}
    </>
  );
}
