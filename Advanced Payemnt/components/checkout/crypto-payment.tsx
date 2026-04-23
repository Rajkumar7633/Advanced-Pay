'use client';

import { useState, useEffect } from 'react';
import { QrCode, Wallet, Bitcoin, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CryptoPaymentProps {
  amount: number;
}

export function CryptoPayment({ amount }: CryptoPaymentProps) {
  const [cryptoRate, setCryptoRate] = useState(0.000015); // mock BTC conversion rate
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const [copied, setCopied] = useState(false);
  const [txState, setTxState] = useState<'waiting' | 'detecting' | 'confirmed'>('waiting');

  const btcAmount = (amount * cryptoRate).toFixed(6);
  const mockAddress = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mockAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = () => {
    setTxState('detecting');
    setTimeout(() => {
       setTxState('confirmed');
    }, 3000);
  };

  return (
    <div className="bg-[#0b101a] border border-slate-800 rounded-2xl p-6 text-white space-y-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
      
      <div className="flex justify-between items-start relative z-10">
         <div className="space-y-1">
             <div className="flex items-center gap-2">
                 <Bitcoin className="w-6 h-6 text-orange-500" />
                 <h3 className="font-bold text-lg">Pay with Bitcoin</h3>
             </div>
             <p className="text-slate-400 text-sm">Scan QR or send exact amount</p>
         </div>
         <div className="text-right">
             <div className="flex items-center gap-1.5 text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <RefreshCw className="w-3 h-3 animate-spin duration-3000" />
                <span className="text-xs font-mono tracking-widest">{formatTime(timeLeft)}</span>
             </div>
         </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl relative z-10">
         <div className="w-48 h-48 bg-white rounded-lg p-2 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.15)] mb-6">
            <QrCode className="w-full h-full text-black" />
         </div>

         <div className="text-center space-y-1 mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest">Amount to Send</p>
            <p className="font-mono text-3xl font-black text-orange-400 tracking-wider">
               {btcAmount} <span className="text-lg text-orange-500/50 uppercase">BTC</span>
            </p>
            <p className="text-slate-500 text-sm">≈ ${(amount).toFixed(2)} USD</p>
         </div>

         <div className="w-full bg-slate-900/80 rounded-lg p-1 border border-slate-700 flex items-center">
            <div className="flex-1 overflow-hidden pointer-events-none">
               <p className="font-mono text-xs text-slate-300 truncate px-3">
                 {mockAddress}
               </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white shrink-0" onClick={handleCopy}>
               {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
         </div>
      </div>

      <div className="pt-2 border-t border-slate-800 relative z-10 flex flex-col gap-3">
         {txState === 'waiting' && (
           <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-12" onClick={handleSimulatePayment}>
              <Wallet className="w-4 h-4 mr-2" /> Connect Web3 Wallet
           </Button>
         )}
         {txState === 'detecting' && (
           <div className="w-full h-12 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-orange-400 font-medium tracking-wide">Detecting payment on network...</span>
           </div>
         )}
         {txState === 'confirmed' && (
           <div className="w-full h-12 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center gap-3 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium tracking-wide">Transaction Confirmed!</span>
           </div>
         )}
      </div>

    </div>
  );
}
