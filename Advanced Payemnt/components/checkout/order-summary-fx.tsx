'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';

interface OrderSummaryFXProps {
  baseAmount: number;
  baseDesc: string;
  onAmountChange: (newAmount: number) => void;
  onDescChange: (newDesc: string) => void;
  onCurrencyChange: (currency: string, fxAmount: number) => void;
}

const FX_RATES: Record<string, { symbol: string; rate: number; label: string }> = {
  INR: { symbol: '₹', rate: 1, label: 'Indian Rupee' },
  USD: { symbol: '$', rate: 0.012, label: 'US Dollar' },
  EUR: { symbol: '€', rate: 0.011, label: 'Euro' },
  GBP: { symbol: '£', rate: 0.0095, label: 'British Pound' },
};

export function OrderSummaryFX({ baseAmount, baseDesc, onAmountChange, onDescChange, onCurrencyChange }: OrderSummaryFXProps) {
  const [activeCurrency, setActiveCurrency] = useState('INR');
  const [isConverting, setIsConverting] = useState(false);

  // The true base is INR, we calculate the display based on active rate
  const displayAmount = baseAmount * FX_RATES[activeCurrency].rate;

  const handleCurrencySelect = (curr: string) => {
    if (curr === activeCurrency) return;
    setIsConverting(true);
    setTimeout(() => {
      setActiveCurrency(curr);
      setIsConverting(false);
      onCurrencyChange(curr, baseAmount * FX_RATES[curr].rate);
    }, 400); // UI Matrix translation effect
  };

  return (
    <Card className="bg-slate-800 border-slate-700 shadow-2xl relative overflow-hidden group">
      {/* Animated FX Background Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
      
      <CardHeader className="relative z-10 bg-slate-800">
        <div className="flex justify-between items-center">
            <CardTitle className="text-white text-lg font-black tracking-wider uppercase">Order Summary</CardTitle>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1 rounded-full shadow-inner">
               {Object.keys(FX_RATES).map(curr => (
                 <button
                   key={curr}
                   onClick={() => handleCurrencySelect(curr)}
                   className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      activeCurrency === curr 
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.8)]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                   }`}
                 >
                   {curr}
                 </button>
               ))}
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10 bg-slate-800 pt-2">
        <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-700">
            <div>
              <label className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-widest">Base Amount ({FX_RATES['INR'].symbol})</label>
              <input 
                  type="number" 
                  value={baseAmount} 
                  onChange={e => onAmountChange(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-widest">Description</label>
              <input 
                  type="text" 
                  value={baseDesc} 
                  onChange={e => onDescChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
              />
            </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Taxes & Fees</span>
          <span className="text-white border px-2 py-0.5 rounded text-xs border-slate-600">Included</span>
        </div>

        <div className="flex justify-between items-end pt-3 border-t border-slate-700 h-14">
          <div className="flex items-center gap-2">
             <Globe className="w-5 h-5 text-blue-400 animate-[spin_10s_linear_infinite]" />
             <span className="text-white font-bold tracking-widest uppercase">Total</span>
          </div>
          <div className={`transition-all duration-300 relative ${isConverting ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
             <span className="text-3xl font-black text-blue-400 font-mono tracking-tighter">
               {FX_RATES[activeCurrency].symbol}{displayAmount.toFixed(2)}
             </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
