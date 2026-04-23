'use client';

import { CheckCircle2, Download, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReceiptPrinterProps {
  amount: number;
  currencySymbol: string;
  description: string;
  transactionId: string;
  onReset: () => void;
}

export function ReceiptPrinter({ amount, currencySymbol, description, transactionId, onReset }: ReceiptPrinterProps) {
  
  const handleDownload = () => {
     // A dummy download action since it's a DOM simulation
     alert('Receipt downloaded locally!');
  };

  return (
    <div className="w-full min-h-[500px] flex flex-col items-center justify-start mt-4 overflow-hidden relative pt-4">
       
       {/* POS Terminal Slot */}
       <div className="absolute top-0 w-64 h-8 bg-gradient-to-b from-gray-900 to-black rounded-t-lg border-x-4 border-t-4 border-gray-800 shadow-2xl z-20 flex items-center justify-center">
          <div className="w-48 h-1 bg-black rounded-full shadow-inner opacity-80" />
       </div>

       {/* The Paper Receipt (Slides down from terminal) */}
       <div className="w-56 bg-white shadow-xl relative z-10 animate-[printDown_2.5s_cubic-bezier(0.25,1,0.5,1)_forwards] origin-top border-x border-b border-gray-200">
          
          {/* Jagged tear edge effect at top */}
          <div className="h-2 w-full bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:10px_10px] bg-repeat-x -mt-1 absolute top-0" />

          {/* Receipt Content */}
          <div className="p-5 font-mono text-xs text-black h-full flex flex-col">
             <div className="text-center space-y-1 mb-4 border-b border-dashed border-gray-300 pb-4">
                <CheckCircle2 className="w-10 h-10 mx-auto text-black mb-2" />
                <h3 className="font-bold text-lg">APPROVED</h3>
                <p className="text-gray-500">ADVANCED PAY</p>
             </div>

             <div className="space-y-2 mb-4 border-b border-dashed border-gray-300 pb-4">
                <div className="flex justify-between">
                   <span className="text-gray-500">DATE:</span>
                   <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-gray-500">TIME:</span>
                   <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-gray-500">AUTH:</span>
                   <span>82739A</span>
                </div>
             </div>

             <div className="space-y-2 mb-4 border-b border-black pb-4">
                <div className="flex justify-between font-bold">
                   <span className="truncate w-2/3">{description}</span>
                   <span>----</span>
                </div>
                <div className="flex justify-between text-lg font-black mt-2">
                   <span>TOTAL</span>
                   <span>{currencySymbol}{amount.toFixed(2)}</span>
                </div>
             </div>

             <div className="text-center mt-auto opacity-70">
                <p className="text-[10px]">TXN: {transactionId || 'SYS_029384'}</p>
                {/* Fake Barcode */}
                <div className="w-full h-8 flex mt-2 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_5px,transparent_5px,transparent_8px)]" />
                <p className="mt-2 text-[9px] uppercase tracking-widest font-bold">Customer Copy</p>
             </div>
          </div>
          
          {/* Jagged tear edge effect at bottom */}
          <div className="h-2 w-full bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:10px_10px] bg-repeat-x rotate-180 absolute -bottom-1" />
       </div>

       {/* Actions (fade in after print delay) */}
       <div className="flex gap-4 mt-8 opacity-0 animate-[fadeIn_0.5s_ease-out_2.5s_forwards]">
          <Button onClick={handleDownload} className="bg-white hover:bg-gray-100 text-black border border-gray-200">
             <Download className="w-4 h-4 mr-2" /> Save PDF
          </Button>
          <Button onClick={onReset} variant="outline" className="text-white border-slate-700 hover:bg-slate-800">
             <RefreshCcw className="w-4 h-4 mr-2" /> New Sandbox Order
          </Button>
       </div>

       <style dangerouslySetInnerHTML={{__html: `
         @keyframes printDown {
            0% { transform: translateY(-100%) scaleY(0); opacity: 0; }
            1% { opacity: 1; }
            100% { transform: translateY(0) scaleY(1); opacity: 1; }
         }
         @keyframes fadeIn {
            to { opacity: 1; transform: translateY(0); }
         }
       `}} />
    </div>
  );
}
