'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { merchantsApi } from '@/lib/api';
import { 
  Palette, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Paintbrush, 
  MonitorSmartphone, 
  Smartphone,
  Loader2,
  LayoutPanelLeft,
  Layout,
  Type,
  Wand2,
  MousePointerClick
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_THEMES = [
  { name: 'Midnight', color: '#6366f1', bg: 'dark' },
  { name: 'Ocean', color: '#0ea5e9', bg: 'light' },
  { name: 'Forest', color: '#10b981', bg: 'light' },
  { name: 'Sunset', color: '#f97316', bg: 'light' },
  { name: 'Cyberpunk', color: '#ec4899', bg: 'dark' },
  { name: 'Monochrome', color: '#171717', bg: 'light' },
];

export default function BrandingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Theme settings
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [borderRadius, setBorderRadius] = useState('0.5rem');
  const [backgroundStyle, setBackgroundStyle] = useState('light');
  const [logoUrl, setLogoUrl] = useState('');
  const [typography, setTypography] = useState('sans');
  const [layoutStyle, setLayoutStyle] = useState('center');
  
  // Interactive Preview State
  const [previewState, setPreviewState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbank'>('card');

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
            setTypography(prof.data.settings.theme.typography || 'sans');
            setLayoutStyle(prof.data.settings.theme.layout_style || 'center');
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
          logo_url: logoUrl,
          typography: typography,
          layout_style: layoutStyle
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

  const applyPreset = (theme: typeof PRESET_THEMES[0]) => {
    setPrimaryColor(theme.color);
    setBackgroundStyle(theme.bg);
  };

  const getFontFamily = () => {
    switch(typography) {
      case 'sans': return 'ui-sans-serif, system-ui, sans-serif';
      case 'serif': return 'ui-serif, Georgia, serif';
      case 'mono': return 'ui-monospace, SFMono-Regular, monospace';
      default: return 'ui-sans-serif, system-ui, sans-serif';
    }
  };

  // Simulated click handler for preview
  const handlePreviewClick = () => {
    if (previewState !== 'idle') return;
    setPreviewState('processing');
    setTimeout(() => {
      setPreviewState('success');
      setTimeout(() => {
        setPreviewState('idle');
      }, 2500);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Palette className="w-8 h-8 text-indigo-500" /> Checkout Studio
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Design a pixel-perfect payment experience. Your Hosted Payment Pages will automatically inherit these visual tokens.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COMPONENT: CONTROLS */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-500" /> Pre-curated Themes
              </CardTitle>
              <CardDescription>Instant premium aesthetics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => applyPreset(theme)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-transform hover:scale-105 ${
                      primaryColor === theme.color 
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' 
                        : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: theme.color }} />
                    {theme.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-primary" /> Visual Tokens
              </CardTitle>
              <CardDescription>Configure granular styling overrides.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-muted-foreground text-xs font-bold uppercase tracking-wider">Accent Color</Label>
                  <div className="relative flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 p-0 border-0 rounded-lg overflow-hidden cursor-pointer shadow-inner appearance-none"
                    />
                    <Input 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      className="font-mono tracking-widest uppercase font-semibold h-10 border-border focus-visible:ring-1" 
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-muted-foreground text-xs font-bold uppercase tracking-wider">Typography</Label>
                  <div className="flex bg-muted p-1 rounded-lg">
                    <button 
                      onClick={() => setTypography('sans')}
                      className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-sm transition-all ${typography === 'sans' ? 'bg-background shadow-sm font-bold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Sans
                    </button>
                    <button 
                      onClick={() => setTypography('serif')}
                      className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-sm transition-all ${typography === 'serif' ? 'bg-background shadow-sm font-bold text-foreground font-serif' : 'text-muted-foreground hover:text-foreground font-serif'}`}
                    >
                      Serif
                    </button>
                    <button 
                      onClick={() => setTypography('mono')}
                      className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-sm transition-all ${typography === 'mono' ? 'bg-background shadow-sm font-bold text-foreground font-mono' : 'text-muted-foreground hover:text-foreground font-mono'}`}
                    >
                      Mono
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-muted-foreground text-xs font-bold uppercase tracking-wider">Border Radius (Shapes)</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant={borderRadius === '0px' ? 'default' : 'outline'} className={`rounded-none h-9 ${borderRadius === '0px' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('0px')}>Sharp</Button>
                  <Button variant={borderRadius === '0.5rem' ? 'default' : 'outline'} className={`rounded-lg h-9 ${borderRadius === '0.5rem' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('0.5rem')}>Soft</Button>
                  <Button variant={borderRadius === '1rem' ? 'default' : 'outline'} className={`rounded-2xl h-9 ${borderRadius === '1rem' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('1rem')}>Round</Button>
                  <Button variant={borderRadius === '9999px' ? 'default' : 'outline'} className={`rounded-full h-9 ${borderRadius === '9999px' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} onClick={() => setBorderRadius('9999px')}>Pill</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-muted-foreground text-xs font-bold uppercase tracking-wider">Layout Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setLayoutStyle('center')}
                      className={`flex flex-col items-center justify-center gap-1 p-2 border-2 rounded-xl transition-all ${layoutStyle === 'center' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <Layout className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase">Centered</span>
                    </button>
                    <button 
                      onClick={() => setLayoutStyle('split')}
                      className={`flex flex-col items-center justify-center gap-1 p-2 border-2 rounded-xl transition-all ${layoutStyle === 'split' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <LayoutPanelLeft className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase">Split</span>
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-muted-foreground text-xs font-bold uppercase tracking-wider">Color Scheme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setBackgroundStyle('light')}
                      className={`flex flex-col items-center justify-center gap-1 p-2 border-2 rounded-xl transition-all ${backgroundStyle === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <div className="w-5 h-5 rounded-full border shadow-sm bg-white"></div>
                      <span className="text-[10px] font-bold uppercase">Light</span>
                    </button>
                    <button 
                      onClick={() => setBackgroundStyle('dark')}
                      className={`flex flex-col items-center justify-center gap-1 p-2 border-2 rounded-xl transition-all ${backgroundStyle === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <div className="w-5 h-5 rounded-full shadow-sm bg-slate-900 border border-slate-700"></div>
                      <span className="text-[10px] font-bold uppercase">Dark</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-muted-foreground text-xs font-bold uppercase tracking-wider">Brand Logo URL</Label>
                <Input 
                  placeholder="https://cdn.example.com/logo.png" 
                  value={logoUrl} 
                  onChange={(e) => setLogoUrl(e.target.value)} 
                  className="bg-card text-muted-foreground"
                />
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <Button 
                  onClick={handleSaveTheme} 
                  disabled={isLoading || saveLoading} 
                  className="w-full font-bold h-12 shadow-md hover:scale-[1.01] transition-transform text-white"
                  style={{ backgroundColor: primaryColor, borderRadius }}
                >
                  {saveLoading ? 'Deploying Changes…' : 'Publish Global Theme'}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> Changes apply instantly to all live checkouts.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* RIGHT COMPONENT: LIVE PREVIEW STUDIO */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-slate-900/95 overflow-hidden relative shadow-2xl border border-slate-800 h-[700px]">
          
          {/* Preview Toolbar */}
          <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-black/20 shrink-0">
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-widest">
              <MonitorSmartphone className="w-3.5 h-3.5" /> Interactive Sandbox
            </div>
            
            {/* Interactive State Toggle */}
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2">State:</span>
              <button 
                onClick={() => setPreviewState('idle')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${previewState === 'idle' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Idle
              </button>
              <button 
                onClick={handlePreviewClick}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${previewState !== 'idle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
              >
                <MousePointerClick className="w-3 h-3" /> Simulate Payment
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-[0.99]" style={{ fontFamily: getFontFamily() }}>
            
            <AnimatePresence mode="wait">
              {layoutStyle === 'center' ? (
                // CENTERED LAYOUT
                <motion.div 
                   key="center"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.3 }}
                   className="w-full max-w-[420px] transition-all duration-300 shadow-2xl relative"
                   style={{ 
                     backgroundColor: backgroundStyle === 'light' ? '#ffffff' : '#0f172a',
                     color: backgroundStyle === 'light' ? '#0f172a' : '#f8fafc',
                     borderRadius,
                     boxShadow: `0 25px 50px -12px ${primaryColor}25` 
                   }}
                >
                   {/* Dynamic Theme Banner / Accent Stripe */}
                   <div className="h-2 w-full absolute top-0 left-0 transition-colors duration-300" style={{ backgroundColor: primaryColor, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }}></div>
                   
                   <div className="p-8 pb-4 border-b border-border/10">
                      <div className="flex justify-between items-start mb-6">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center font-bold text-lg text-white transition-colors duration-300" style={{ backgroundColor: primaryColor, borderRadius }}>
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
                   
                   <div className="p-6 pt-5 bg-black/5 dark:bg-white/[0.02]" style={{ borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }}>
                      <div className="space-y-3">
                        {/* Payment Method Tabs */}
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/10 dark:bg-white/5 mb-1">
                          <button onClick={() => setPaymentMethod('card')} className={`py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-colors ${paymentMethod === 'card' ? 'bg-background shadow text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}>
                            💳 Card
                          </button>
                          <button onClick={() => setPaymentMethod('upi')} className={`py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center justify-center transition-colors ${paymentMethod === 'upi' ? 'bg-background shadow text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}>
                            <span className="text-violet-500 font-black mr-0.5">U</span>UPI
                          </button>
                          <button onClick={() => setPaymentMethod('netbank')} className={`py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center justify-center transition-colors ${paymentMethod === 'netbank' ? 'bg-background shadow text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}>
                            🏦 Net Bank
                          </button>
                        </div>

                        {/* Card Fields */}
                        {paymentMethod === 'card' && (<>
                          <div>
                            <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">Full Name</Label>
                            <Input disabled placeholder="John Doe" className="bg-background border-border/20 text-foreground h-8 text-sm" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                          </div>
                          <div>
                            <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">Email address</Label>
                            <Input disabled placeholder="customer@example.com" className="bg-background border-border/20 text-foreground h-8 text-sm" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                          </div>
                          <div>
                            <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">Card number</Label>
                            <div className="relative">
                              <Input disabled placeholder="4242 4242 4242 4242" className="bg-background border-border/20 text-foreground pl-9 h-8 text-sm" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                              <CreditCard className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-40" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">Expiry</Label>
                              <Input disabled placeholder="MM / YY" className="bg-background border-border/20 text-foreground h-8 text-sm" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                            </div>
                            <div>
                              <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">CVV</Label>
                              <Input disabled placeholder="•••" className="bg-background border-border/20 text-foreground h-8 text-sm" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                            </div>
                          </div>
                        </>)}

                        {/* UPI Fields */}
                        {paymentMethod === 'upi' && (<>
                          <div>
                            <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">UPI ID</Label>
                            <Input disabled placeholder="yourname@upi" className="bg-background border-border/20 text-foreground h-8 text-sm" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                              <div key={app} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-[10px] font-bold text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors" style={{ borderRadius }}>
                                {app === 'GPay' ? '🟢' : app === 'PhonePe' ? '🟣' : app === 'Paytm' ? '🔵' : '🇮🇳'} {app}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 text-center">Or enter UPI ID above to pay directly</p>
                        </>)}

                        {/* Net Banking Fields */}
                        {paymentMethod === 'netbank' && (<>
                          <div>
                            <Label className="text-[10px] opacity-50 mb-1 block font-bold uppercase tracking-wider">Select Bank</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Yes Bank'].map(bank => (
                                <div key={bank} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors" style={{ borderRadius }}>
                                  🏦 {bank}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 text-center">You will be redirected to your bank's secure portal</p>
                        </>)}
                        
                        <div className="pt-4 space-y-3">
                          <Button 
                            className="w-full h-12 text-white font-bold tracking-wide shadow-lg hover:scale-[1.02] transform transition-all duration-300 relative overflow-hidden group" 
                            style={{ backgroundColor: primaryColor, borderRadius }}
                            onClick={handlePreviewClick}
                          >
                            <AnimatePresence mode="wait">
                              {previewState === 'idle' && (
                                <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                  Pay {formatCurrency(4999)}
                                </motion.span>
                              )}
                              {previewState === 'processing' && (
                                <motion.span key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                  <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                                </motion.span>
                              )}
                              {previewState === 'success' && (
                                <motion.span key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5" /> Payment Successful
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </Button>
                          <p className="text-[10px] text-center opacity-40 uppercase tracking-widest font-mono">Powered by Advanced Pay</p>
                        </div>
                      </div>
                   </div>
                </motion.div>

              ) : (
                
                // SPLIT LAYOUT
                <motion.div 
                   key="split"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.3 }}
                   className="w-full max-w-4xl flex transition-all duration-300 shadow-2xl relative overflow-hidden"
                   style={{ 
                     backgroundColor: backgroundStyle === 'light' ? '#ffffff' : '#0f172a',
                     color: backgroundStyle === 'light' ? '#0f172a' : '#f8fafc',
                     borderRadius,
                     boxShadow: `0 25px 50px -12px ${primaryColor}30` 
                   }}
                >
                   {/* Left Side: Product Info */}
                   <div className="flex-1 p-10 flex flex-col justify-between relative" style={{ backgroundColor: primaryColor }}>
                     <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                     <div className="relative z-10">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="h-10 object-contain mb-10" />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center font-bold text-xl bg-white/20 text-white mb-10 backdrop-blur-md" style={{ borderRadius }}>
                            {profile?.business_name ? profile.business_name.charAt(0).toUpperCase() : 'M'}
                          </div>
                        )}
                        <p className="text-white/80 font-medium text-sm mb-2 tracking-widest uppercase">Test Payment</p>
                        <h2 className="text-white text-3xl font-black mb-4 leading-tight">{profile?.business_name || 'My Business'} <br/>Premium Order</h2>
                     </div>
                     <div className="relative z-10 text-white font-black text-5xl">
                       {formatCurrency(4999)}
                     </div>
                   </div>

                   {/* Right Side: Payment Form */}
                   <div className="flex-1 p-10 bg-transparent flex flex-col justify-center">
                       <div className="space-y-3">
                         <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/5">
                           <button className="py-2 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 bg-background shadow text-foreground">
                             💳 Card
                           </button>
                           <button className="py-2 rounded-md text-[10px] font-semibold tracking-wide text-muted-foreground/60 flex items-center justify-center">
                             UPI ID
                           </button>
                           <button className="py-2 rounded-md text-[10px] font-semibold tracking-wide text-muted-foreground/60">
                             🏦 Net Bank
                           </button>
                         </div>
                         <div>
                           <Label className="text-xs opacity-60 mb-1.5 block font-bold uppercase tracking-wider">Full Name</Label>
                           <Input disabled placeholder="John Doe" className="bg-background/50 border-border/20 text-foreground h-10 transition-all duration-300" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                         </div>
                         <div>
                           <Label className="text-xs opacity-60 mb-1.5 block font-bold uppercase tracking-wider">Email address</Label>
                           <Input disabled placeholder="customer@example.com" className="bg-background/50 border-border/20 text-foreground h-10 transition-all duration-300" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                         </div>
                         <div>
                           <Label className="text-xs opacity-60 mb-1.5 block font-bold uppercase tracking-wider">Card number</Label>
                           <div className="relative">
                             <Input disabled placeholder="4242 4242 4242 4242" className="bg-background/50 border-border/20 text-foreground pl-11 h-10 transition-all duration-300" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                             <CreditCard className="w-4 h-4 absolute left-3.5 top-3 opacity-50" />
                           </div>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <div>
                             <Label className="text-xs opacity-60 mb-1.5 block font-bold uppercase tracking-wider">Expiry</Label>
                             <Input disabled placeholder="MM / YY" className="bg-background/50 border-border/20 text-foreground h-10 transition-all duration-300" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                           </div>
                           <div>
                             <Label className="text-xs opacity-60 mb-1.5 block font-bold uppercase tracking-wider">CVV</Label>
                             <Input disabled placeholder="•••" className="bg-background/50 border-border/20 text-foreground h-10 transition-all duration-300" style={{ borderRadius: borderRadius !== '9999px' ? borderRadius : '0.75rem' }} />
                           </div>
                         </div>
                        <div className="pt-4 space-y-4">
                          <Button 
                            className="w-full h-14 text-white font-bold tracking-wide shadow-lg hover:scale-[1.02] transform transition-all duration-300 text-lg relative overflow-hidden" 
                            style={{ backgroundColor: primaryColor, borderRadius }}
                            onClick={handlePreviewClick}
                          >
                            <AnimatePresence mode="wait">
                              {previewState === 'idle' && (
                                <motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                  Pay Now
                                </motion.span>
                              )}
                              {previewState === 'processing' && (
                                <motion.span key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                  <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                                </motion.span>
                              )}
                              {previewState === 'success' && (
                                <motion.span key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5" /> Success
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </Button>
                          <div className="flex items-center justify-center gap-1.5 opacity-40">
                            <ShieldCheck className="w-4 h-4" />
                            <p className="text-[10px] uppercase tracking-widest font-bold">Secured by Advanced Pay</p>
                          </div>
                        </div>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>
    </div>
  );
}
