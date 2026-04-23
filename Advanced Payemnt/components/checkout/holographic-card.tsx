'use client';

interface HolographicCardProps {
  focusedField: 'number' | 'name' | 'expiry' | 'cvc' | null;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

export function HolographicCard({ focusedField, cardNumber, cardName, expiry, cvv }: HolographicCardProps) {
  // Determine card flip state
  const isFlipped = focusedField === 'cvc';

  // Format card number with spaces (e.g. 1234 5678 1234 5678)
  const formatCardNumber = (num: string) => {
    if (!num) return '•••• •••• •••• ••••';
    const cleaned = num.replace(/\D/g, '').substring(0, 16);
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) parts.push(cleaned.substring(i, i + 4));
    const formatted = parts.join(' ');
    // Pad with dots if incomplete
    return formatted + ' •••• •••• •••• ••••'.substring(formatted.length);
  };

  const getBrand = (num: string) => {
    if (num.startsWith('4')) return 'VISA';
    if (num.startsWith('5')) return 'MASTERCARD';
    if (num.startsWith('3')) return 'AMEX';
    return 'BANK CARD';
  };

  return (
    <div className="w-full max-w-sm mx-auto perspective-[1200px] mb-8 mt-2 h-56 group cursor-pointer z-20">
      <div 
        className="w-full h-full relative transition-all duration-700 preserve-3d relative"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        
        {/* Holographic Glowing Hue Behind Card */}
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-2xl -z-10 group-hover:bg-blue-400/40 transition-colors duration-500" />

        {/* FRONT FACE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-6 flex flex-col justify-between">
            {/* Hologram Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/10 to-transparent pointer-events-none opacity-50" />
            
            {/* Glossy Reflection Mask */}
            <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-[-20deg] group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-10 rounded-md bg-gradient-to-bl from-yellow-200 to-amber-500 border border-yellow-100 shadow-sm" />
                <div className="text-right">
                    <span className="text-xl font-black italic tracking-widest text-slate-100 opacity-90 drop-shadow-md">
                        {getBrand(cardNumber)}
                    </span>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className={`transition-all duration-300 font-mono text-2xl tracking-[0.2em] text-white tabular-nums drop-shadow-md ${focusedField === 'number' ? 'text-blue-300 scale-105 origin-left' : ''}`}>
                    {formatCardNumber(cardNumber)}
                </div>
                
                <div className="flex justify-between items-end">
                    <div className="space-y-1 w-2/3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Cardholder</p>
                        <p className={`font-medium tracking-wide truncate text-white uppercase transition-colors ${focusedField === 'name' ? 'text-blue-300' : ''}`}>
                            {cardName || 'YOUR NAME'}
                        </p>
                    </div>
                    <div className="space-y-1 w-1/3 text-right">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Expires</p>
                        <p className={`font-mono tracking-widest text-white transition-colors ${focusedField === 'expiry' ? 'text-blue-300' : ''}`}>
                            {expiry || 'MM/YY'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* BACK FACE */}
        <div 
           className="absolute inset-0 w-full h-full backface-hidden rounded-2xl shadow-2xl border border-white/20 bg-gradient-to-tl from-slate-900 to-indigo-950 flex flex-col pt-6"
           style={{ transform: 'rotateY(180deg)' }}
        >
            <div className="w-full h-12 bg-black/80 mt-2" />
            <div className="px-6 space-y-4 mt-6">
                <div className="w-full flex items-center h-10 bg-gradient-to-r from-slate-200 to-slate-100 p-2 rounded relative">
                    <div className="w-full h-full bg-repeating-linear-gradient-[45deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px]" />
                    <span className="absolute right-3 font-mono text-lg font-black tracking-widest text-black/80">
                        {cvv || '•••'}
                    </span>
                </div>
                <div className="w-1/2 h-2 bg-slate-800 rounded-full" />
                <div className="w-3/4 h-2 bg-slate-800 rounded-full" />
            </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
         .perspective-\\[1200px\\] { perspective: 1200px; }
         .preserve-3d { transform-style: preserve-3d; }
         .backface-hidden { backface-visibility: hidden; }
      `}} />
    </div>
  );
}
