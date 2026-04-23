'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { merchantsApi } from '@/lib/api';
import { Palette, CheckCircle2, ShieldCheck, CreditCard, Paintbrush, MonitorSmartphone, Smartphone } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';

export default function BrandingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Theme settings
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [borderRadius, setBorderRadius] = useState('0.5rem');
  const [backgroundStyle, setBackgroundStyle] = useState('light');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const prof = await merchantsApi.getProfile();
        if (!cancelled && prof?.data) {
          setProfile(prof.data);
          if (prof.data.settings?.theme) {
            setPrimaryColor(prof.data.settings.theme.primary_color || '#2563eb');
            setBorderRadius(prof.data.settings.theme.border_radius || '0.5rem');
            setBackgroundStyle(prof.data.settings.theme.background_style || 'light');
            setLogoUrl(prof.data.settings.theme.logo_url || '');
          }
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveTheme = async () => {
    setSaveLoading(true);
    try {
      const mergedSettings = {
        ...profile?.settings,
        theme: {
          primary_color: primaryColor,
          border_radius: borderRadius,
          background_style: backgroundStyle,
          logo_url: logoUrl
        }
      };

      await merchantsApi.updateProfile({
        business_name: profile?.business_name || 'My Business',
        email: profile?.email || '',
        settings: mergedSettings
      });
      alert('Checkout Theme published successfully!');
    } catch (e) {
      console.error('Theme update error', e);
      alert('Failed to update Checkout Theme.');
    } finally {
      setSaveLoading(false);
    }
  };

  const getRadiusStyle = (rad: string) => {
    switch (rad) {
      case '0px': return 'rounded-none';
      case '0.5rem': return 'rounded-lg';
      case '1rem': return 'rounded-2xl';
      case '9999px': return 'rounded-full';
      default: return 'rounded-lg';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Palette className="w-8 h-8 text-indigo-500" /> Checkout Branding
        </h1>
        <p className="text-muted-foreground mt-1">Design a pixel-perfect payment experience. Your Hosted Payment Pages will automatically inherit these visual tokens globally.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COMPONENT: CONTROLS */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Paintbrush className="w-4 h-4 text-primary" /> Visual Tokens</CardTitle>
              <CardDescription>Configure your global styling overrides.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <Label className="mb-3 block text-muted-foreground">Primary Accent Color</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-14 h-14 p-0 border-0 rounded-2xl overflow-hidden cursor-pointer shadow-inner appearance-none"
                    />
                    <div className="absolute inset-0 border-2 border-border pointer-events-none rounded-lg z-10 mix-blend-overlay"></div>
                  </div>
                  <div className="flex-1">
                    <Input 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      className="font-mono tracking-widest text-lg bg-card uppercase font-black px-4 h-12 border-2 focus-visible:ring-0" 
                      style={{ borderColor: primaryColor }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-3 block text-muted-foreground">Border Radius (Shapes)</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant={borderRadius === '0px' ? 'default' : 'outline'} className={`rounded-none h-10 ${borderRadius === '0px' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('0px')}>Sharp</Button>
                  <Button variant={borderRadius === '0.5rem' ? 'default' : 'outline'} className={`rounded-lg h-10 ${borderRadius === '0.5rem' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('0.5rem')}>Soft</Button>
                  <Button variant={borderRadius === '1rem' ? 'default' : 'outline'} className={`rounded-2xl h-10 ${borderRadius === '1rem' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('1rem')}>Round</Button>
                  <Button variant={borderRadius === '9999px' ? 'default' : 'outline'} className={`rounded-full h-10 ${borderRadius === '9999px' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('9999px')}>Pill</Button>
                </div>
              </div>

              <div>
                <Label className="mb-3 block text-muted-foreground">UI Layout Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setBackgroundStyle('light')}
                    className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-all ${backgroundStyle === 'light' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-500/20' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <div className="w-4 h-4 rounded-full border shadow-sm bg-white"></div> Light Theme
                  </button>
                  <button 
                    onClick={() => setBackgroundStyle('dark')}
                    className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-all ${backgroundStyle === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <div className="w-4 h-4 rounded-full shadow-sm bg-slate-900 border border-slate-700"></div> Dark Theme
                  </button>
                </div>
              </div>

              <div>
                <Label className="mb-3 block text-muted-foreground">Brand Logo URL (Optional)</Label>
                <Input 
                  placeholder="https://cdn.example.com/logo.png" 
                  value={logoUrl} 
                  onChange={(e) => setLogoUrl(e.target.value)} 
                  className="bg-card font-mono text-xs text-muted-foreground"
                />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Recommended size: 256x256px png/svg.</p>
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <Button 
                  onClick={handleSaveTheme} 
                  disabled={isLoading || saveLoading} 
                  className="w-full font-bold h-12 shadow-md hover:scale-[1.01] transition-transform"
                  style={{ backgroundColor: primaryColor, borderRadius }}
                >
                  {saveLoading ? 'Deploying Changes…' : 'Publish Global Theme'}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> Instantly propagates to all active links.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* RIGHT COMPONENT: LIVE PREVIEW STUDIO */}
        <div className="lg:col-span-7 flex justify-center items-center rounded-3xl bg-slate-900 overflow-hidden relative shadow-2xl border border-slate-800 p-8 pt-12 pb-16 min-h-[700px]">
          
          <div className="absolute top-4 left-6 flex items-center gap-2 text-slate-500 font-mono text-xs font-bold uppercase tracking-widest">
            <MonitorSmartphone className="w-4 h-4" /> Live Interactive Preview
          </div>

          <div className="absolute top-4 right-6 flex items-center gap-1 text-slate-500">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white"><Smartphone className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white bg-slate-800 text-white"><MonitorSmartphone className="w-4 h-4" /></Button>
          </div>

          {/* SIMULATED CHECKOUT COMPONENT */}
          <div 
             className="w-full max-w-[420px] transition-all duration-500 shadow-2xl relative"
             style={{ 
               backgroundColor: backgroundStyle === 'light' ? '#ffffff' : '#0f172a',
               color: backgroundStyle === 'light' ? '#0f172a' : '#f8fafc',
               borderRadius,
               boxShadow: `0 25px 50px -12px ${primaryColor}20` 
             }}
          >
             {/* Dynamic Theme Banner / Accent Stripe */}
             <div className="h-2 w-full absolute top-0 left-0" style={{ backgroundColor: primaryColor, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }}></div>
             
             <div className="p-8 pb-4 border-b border-border/10">
                <div className="flex justify-between items-start mb-6">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center font-bold text-lg text-white" style={{ backgroundColor: primaryColor, borderRadius }}>
                      {profile?.business_name ? profile.business_name.charAt(0).toUpperCase() : 'M'}
                    </div>
                  )}
                  <div className="text-right">
                     <p className="text-sm opacity-60 font-medium">Test Payment</p>
                     <p className="text-2xl font-black">{formatCurrency(4999)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="opacity-80 pb-2">
                    <p className="text-sm font-semibold opacity-60 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Secure Checkout
                    </p>
                    <p className="font-medium text-lg leading-snug">{profile?.business_name || 'My Business'} — Premium Order</p>
                  </div>
                </div>
             </div>
             
             <div className="p-8 pt-6 bg-black/5 dark:bg-white/[0.02]">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs opacity-60 mb-1 block">Email address</Label>
                    <Input disabled placeholder="customer@example.com" className="bg-background border-border/20 text-foreground" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                  </div>
                  <div>
                    <Label className="text-xs opacity-60 mb-1 block">Card details</Label>
                    <div className="relative">
                      <Input disabled placeholder="4242 4242 4242 4242" className="bg-background border-border/20 text-foreground pl-10" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                      <CreditCard className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                    </div>
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full h-11 text-white font-bold tracking-wide shadow-lg border-b-2 border-black/20 hover:scale-[1.02] transform transition-transform" 
                      style={{ backgroundColor: primaryColor, borderRadius }}
                    >
                      Pay {formatCurrency(4999)}
                    </Button>
                    <p className="text-[10px] text-center opacity-40 uppercase tracking-widest font-mono">Powered by Advanced Pay Seamless Engine</p>
                  </div>
                </div>
             </div>

          </div>

        </div>

      </div>
    </div>
  );
}
