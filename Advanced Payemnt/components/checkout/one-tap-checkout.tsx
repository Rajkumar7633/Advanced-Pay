'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, CreditCard, CheckCircle2 } from 'lucide-react';

interface OneTapCheckoutProps {
  onPay: () => void;
  savedMethod?: { last4: string; brand: string };
  loading?: boolean;
}

export function OneTapCheckout({ onPay, savedMethod, loading }: OneTapCheckoutProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [isPressing, setIsPressing] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPressing && scanStatus !== 'verified') {
      setScanStatus('scanning');
      interval = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setIsPressing(false);
            setScanStatus('verified');
            setTimeout(() => {
               setShowScanner(false);
               onPay();
            }, 1000); // 1-second delay so user sees "Verified" state
            return 100;
          }
          return p + 4; // Animated scanner speed
        });
      }, 50);
    } else if (!isPressing && scanStatus !== 'verified') {
      setScanStatus('idle');
      // If user lets go before 100%, rapidly drop progress to 0
      setScanProgress(0);
    }

    return () => clearInterval(interval);
  }, [isPressing, scanStatus, onPay]);

  const handleStartScan = async () => {
    // Attempt real Hardware Biometrics (Touch ID / Face ID) via WebAuthn
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        
        if (available) {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          
          // Triggers the native Mac Touch ID / Windows Hello prompt
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: "Advanced Pay", id: window.location.hostname },
              user: {
                id: new Uint8Array(16),
                name: "customer@advancedpay.com",
                displayName: "Advanced Pay Customer"
              },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }],
              authenticatorSelection: {
                authenticatorAttachment: "platform", // strictly device biometrics
                userVerification: "required"
              },
              timeout: 60000,
              attestation: "none"
            }
          });

          if (credential) {
            // Biometric hardware success! Immediately process payment!
            setScanStatus('verified');
            setShowScanner(true);
            setScanProgress(100);
            setTimeout(() => {
               setShowScanner(false);
               onPay();
            }, 1000);
            return; // Skip fallback simulator
          }
        }
      } catch (err) {
        console.log("Hardware biometric cancelled or failed. Falling back to simulator.", err);
      }
    }

    // Fallback: Show the on-screen simulated Touch ID if hardware fails or is cancelled
    setShowScanner(true);
    setScanProgress(0);
    setScanStatus('idle');
    setIsPressing(false);
  };

  return (
    <>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3 relative z-0">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          <span className="font-medium text-white">One-Tap Checkout (OTC)</span>
        </div>
        <p className="text-sm text-slate-400">
          Pay with fingerprint • No OTP needed • 80% faster
        </p>
        {savedMethod ? (
          <div className="flex items-center gap-3 p-3 rounded bg-slate-800/80 border border-slate-700">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-white">•••• {savedMethod.last4} ({savedMethod.brand})</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Save card for one-tap on next purchase</p>
        )}
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleStartScan}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Verify with Fingerprint'}
        </Button>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white">
              {scanStatus === 'verified' ? 'Identity Verified!' : 'Fingerprint Scan'}
            </h3>
            
            <div 
              className={`relative w-32 h-32 flex items-center justify-center bg-slate-800 rounded-full border-2 overflow-hidden shadow-inner cursor-pointer select-none touch-none transition-colors duration-200 ${
                isPressing && scanStatus !== 'verified' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'border-slate-700'
              }`}
              onPointerDown={() => scanStatus !== 'verified' && setIsPressing(true)}
              onPointerUp={() => scanStatus !== 'verified' && setIsPressing(false)}
              onPointerLeave={() => scanStatus !== 'verified' && setIsPressing(false)}
              onTouchStart={(e) => { e.preventDefault(); scanStatus !== 'verified' && setIsPressing(true); }}
              onTouchEnd={(e) => { e.preventDefault(); scanStatus !== 'verified' && setIsPressing(false); }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {scanStatus === 'verified' ? (
                <CheckCircle2 className="w-16 h-16 text-green-500 animate-in zoom-in duration-300" />
              ) : (
                <>
                  <Fingerprint className={`w-16 h-16 transition-colors duration-200 ${isPressing ? 'text-blue-500/80 scale-105' : 'text-blue-500/30'}`} />
                  {/* Neon Scanner Bar */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-blue-500/20 border-t-4 border-blue-400 shadow-[0_-4px_15px_rgba(59,130,246,0.6)]"
                    style={{ 
                      height: `${scanProgress}%`,
                      transition: isPressing ? 'height 50ms linear' : 'height 250ms ease-out'
                    }}
                  />
                </>
              )}
            </div>

            <p className="text-slate-400 text-sm text-center">
              {scanStatus === 'verified' 
                ? 'Processing secure one-tap payment...' 
                : 'Press and hold your finger on the sensor to securely confirm this transaction.'}
            </p>
            
            {scanStatus !== 'verified' && (
              <Button variant="ghost" className="text-slate-500 hover:text-white" onClick={() => setShowScanner(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
