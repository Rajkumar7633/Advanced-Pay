'use client';

import { Shield, ShieldAlert, Cpu, Activity, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FraudRadarProps {
  cardBrand: string;
  isTyping: boolean;
}

export function FraudRadar({ cardBrand, isTyping }: FraudRadarProps) {
  const [metrics, setMetrics] = useState([
    { label: 'IP Velocity', status: 'pending', id: 1 },
    { label: 'Card Reputation', status: 'pending', id: 2 },
    { label: 'Network Risk', status: 'pending', id: 3 },
  ]);

  const [radarState, setRadarState] = useState<'idle' | 'scanning' | 'safe' | 'blocked'>('idle');

  useEffect(() => {
    if (isTyping && radarState === 'idle') {
      setRadarState('scanning');
      
      // Simulate live scanning
      let progress = 0;
      const interval = setInterval(() => {
        progress++;
        if (progress === 1) {
          setMetrics(m => m.map(x => x.id === 1 ? { ...x, status: 'safe' } : x));
        }
        if (progress === 2) {
           // Simulate fraud detection if card is "AMEX" (just for testing demo)
           if (cardBrand === 'AMEX') {
              setMetrics(m => m.map(x => x.id === 2 ? { ...x, status: 'danger' } : x));
              setRadarState('blocked');
              clearInterval(interval);
           } else {
              setMetrics(m => m.map(x => x.id === 2 ? { ...x, status: 'safe' } : x));
           }
        }
        if (progress === 3 && cardBrand !== 'AMEX') {
          setMetrics(m => m.map(x => x.id === 3 ? { ...x, status: 'safe' } : x));
          setRadarState('safe');
          clearInterval(interval);
        }
      }, 800);

      return () => clearInterval(interval);
    } else if (!isTyping && radarState === 'safe') {
       // persist safe state
    }
  }, [isTyping, cardBrand, radarState]);

  // Reset if brand changes to idle
  useEffect(() => {
    if (isTyping) {
      setRadarState('scanning');
      setMetrics([
        { label: 'IP Velocity', status: 'pending', id: 1 },
        { label: 'Card Reputation', status: 'pending', id: 2 },
        { label: 'Network Risk', status: 'pending', id: 3 },
      ]);
    }
  }, [cardBrand]);


  return (
    <div className={`p-4 rounded-xl border relative overflow-hidden transition-colors duration-500 mt-6
      ${radarState === 'scanning' ? 'bg-slate-900 border-blue-500/30' : 
        radarState === 'blocked' ? 'bg-red-950 border-red-500/50' : 
        radarState === 'safe' ? 'bg-green-950/30 border-green-500/30' : 'bg-slate-50 border-slate-200'}
    `}>
      {/* Background Matrix Effect when scanning */}
      {radarState === 'scanning' && (
        <div className="absolute inset-0 opacity-10 flex flex-col justify-between pointer-events-none">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-px bg-blue-500 w-full animate-[scandown_2s_linear_infinite]" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 relative z-10">
        <div className={`p-2 rounded-full 
          ${radarState === 'scanning' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 
            radarState === 'blocked' ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
            radarState === 'safe' ? 'bg-green-500/20 text-green-500' : 'bg-slate-200 text-slate-500'}
        `}>
          {radarState === 'blocked' ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
        </div>
        
        <div className="flex-1">
          <h4 className={`font-black tracking-widest text-xs uppercase
             ${radarState === 'scanning' ? 'text-blue-400' : 
               radarState === 'blocked' ? 'text-red-500' : 
               radarState === 'safe' ? 'text-green-500' : 'text-slate-500'}
          `}>
            Advanced Pay Radar
          </h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            {radarState === 'scanning' ? 'Analyzing Live Data...' : 
             radarState === 'blocked' ? 'High Risk Blocked' : 
             radarState === 'safe' ? 'Secured & Encrypted' : 'Awaiting Input'}
          </p>
        </div>

        {radarState === 'scanning' && <Activity className="w-4 h-4 text-blue-400 animate-pulse" />}
      </div>

      <div className="flex justify-between mt-4 relative z-10">
         {metrics.map((m, i) => (
            <div key={m.id} className="flex flex-col items-center gap-1">
               <div className={`w-2 h-2 rounded-full transition-colors duration-500 
                  ${m.status === 'pending' && radarState === 'scanning' ? 'bg-blue-500/30' : 
                    m.status === 'safe' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 
                    m.status === 'danger' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-slate-300'}
               `} />
               <span className={`text-[8px] uppercase tracking-widest font-mono
                  ${m.status === 'safe' ? 'text-green-600' : m.status === 'danger' ? 'text-red-500' : 'text-slate-400'}
               `}>
                 {m.label}
               </span>
            </div>
         ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scandown {
           0% { transform: translateY(-10px); }
           100% { transform: translateY(100px); }
        }
      `}} />
    </div>
  );
}
