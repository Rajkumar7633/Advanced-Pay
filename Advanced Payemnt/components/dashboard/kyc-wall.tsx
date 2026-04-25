'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Fingerprint, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth';

export function KYCWall() {
  const { user } = useAuthStore();
  const [aadhaar, setAadhaar] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(user?.kyc_status === 'under_review' || user?.kyc_status === 'verified');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.kyc_status === 'under_review' || user?.kyc_status === 'verified') {
      setIsDone(true);
    }
  }, [user?.kyc_status]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanStart = () => {
    setIsScanning(true);
    let progress = 0;
    setScanProgress(0); // Reset on start
    
    // Clear any existing interval just in case
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      if (progress >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsScanning(false);
        setSignature(`BIO-HEX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
        toast.success("Biometric hardware signature acquired securely.");
      }
    }, 100); // 100ms * 20 ticks = 2 full seconds of holding required
  };

  const handleScanStop = () => {
    if (!signature) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const submitKYC = async () => {
    if (!aadhaar || !photo || !signature) {
      toast.error('Please complete all security questions to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/merchants/kyc', {
        aadhaar_number: aadhaar,
        passport_photo: photo,
        fingerprint_signature: signature,
      });
      setIsDone(true);
      toast.success('KYC Documents encrypted and transmitted to Vault.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit KYC. The server might be unreachable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-emerald-500/30 bg-card text-center">
          <CardContent className="pt-10 pb-8 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Vault Secured</h2>
            <p className="text-muted-foreground text-sm">
              Your sensitive identification documents have been securely transmitted to our compliance team. 
              Please wait until an Administrator approves your request in the Operations Dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-y-auto p-4 bg-background">
      <Card className="w-full max-w-lg border-primary/20 shadow-xl shadow-primary/5">
        <CardHeader className="space-y-2 border-b border-border/50 pb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Identity & Compliance Vault</CardTitle>
          <CardDescription>
            Because you are operating in a regulated environment, you must deposit your Proof of Identity 
            into our highly-secure cold vault before you can access the payment systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="space-y-3">
            <Label>Aadhaar Number (UIDAI)</Label>
            <Input 
              placeholder="xxxx xxxx xxxx" 
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              className="font-mono text-sm tracking-wider"
            />
          </div>

          <div className="space-y-3">
            <Label>Identity Passport Photo</Label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="file:border-0 file:bg-primary/10 file:text-primary file:text-sm file:font-semibold"
                />
              </div>
              {photo && (
                <div className="h-12 w-12 shrink-0 rounded-md overflow-hidden ring-2 ring-primary/20">
                  <img src={photo} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Proof-of-Life Biometric Scanner</Label>
            <p className="text-xs text-muted-foreground mb-4">
              Press and hold the scanner below to cryptographically bind this device to your identity.
            </p>
            <div className="flex flex-col items-center">
              <button
                onMouseDown={handleScanStart}
                onMouseUp={handleScanStop}
                onMouseLeave={handleScanStop}
                onTouchStart={handleScanStart}
                onTouchEnd={handleScanStop}
                disabled={!!signature}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                  signature
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : isScanning
                    ? 'scale-105 border-primary bg-primary/20 cursor-grabbing'
                    : 'border-muted-foreground/20 bg-muted hover:border-primary/50 cursor-grab'
                }`}
              >
                {signature ? (
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                ) : (
                  <Fingerprint className={`h-10 w-10 ${isScanning ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                )}
                {isScanning && !signature && (
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-primary opacity-20"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="289"
                      strokeDashoffset={289 - (289 * scanProgress) / 100}
                      className="text-primary"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button 
            className="w-full mt-4" 
            size="lg" 
            onClick={submitKYC}
            disabled={isSubmitting || !aadhaar || !photo || !signature}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Encrypt & Lock in Vault
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
