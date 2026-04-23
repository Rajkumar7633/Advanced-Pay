'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ReceiptPrinter } from '@/components/checkout/receipt-printer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function DonePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const amount = searchParams?.get('amount') ? parseInt(searchParams.get('amount') as string, 10) : 0;
  const currency = searchParams?.get('currency') || 'USD';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
  const desc = searchParams?.get('desc') || 'Standard Order';
  const transactionId = searchParams?.get('orderId') || `ORD_${Math.random().toString(36).substring(7).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Aura */}
      <div className="absolute top-1/2 left-1/==2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-50">
         <Link href="/checkout">
           <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-blue-300">
             <ArrowLeft className="w-5 h-5 mr-2" />
             New Payment
           </Button>
         </Link>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto">
        <ReceiptPrinter 
           amount={amount}
           currencySymbol={currencySymbol}
           description={desc}
           transactionId={transactionId}
           onReset={() => router.push('/checkout')}
        />
      </div>
    </div>
  );
}

export default function CheckoutDonePage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
       </div>
    }>
      <DonePageContent />
    </Suspense>
  );
}
