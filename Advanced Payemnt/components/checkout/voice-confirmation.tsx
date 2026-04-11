'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, CheckCircle2 } from 'lucide-react';

interface VoiceConfirmationProps {
  onConfirm: () => void;
  languages?: string[];
}

const LANGUAGE_MAP: Record<string, { code: string, phrases: string[] }> = {
  'Hindi': { code: 'hi-IN', phrases: ['confirm payment', 'भुगतान करें', 'पेमेंट कन्फर्म करें', 'हाँ', 'confirm'] },
  'Tamil': { code: 'ta-IN', phrases: ['confirm payment', 'செலுத்து', 'கட்டணத்தை உறுதிப்படுத்து', 'ஆம்', 'confirm'] },
  'Telugu': { code: 'te-IN', phrases: ['confirm payment', 'చెల్లించు', 'చెల్లింపు నిర్ధారించు', 'అవును', 'confirm'] },
  'English': { code: 'en-IN', phrases: ['confirm payment', 'pay now', 'confirm', 'yes'] }
};

export function VoiceConfirmation({
  onConfirm,
  languages = ['Hindi', 'Tamil', 'Telugu', 'English'],
}: VoiceConfirmationProps) {
  const [recording, setRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'verified' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
      } else {
        setStatus('error'); // Browser unsupported
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      setRecording(true);
      setStatus('listening');
      setTranscript('');
      
      const recognize = recognitionRef.current;
      recognize.lang = LANGUAGE_MAP[selectedLang]?.code || 'en-IN';
      
      recognize.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        const lowerTranscript = currentTranscript.toLowerCase().trim();
        setTranscript(lowerTranscript);

        // Check if the current phrase matches the expected confirmation triggers
        const targetPhrases = LANGUAGE_MAP[selectedLang]?.phrases || [];
        const isMatch = targetPhrases.some(phrase => lowerTranscript.includes(phrase.toLowerCase()));

        if (isMatch) {
          recognize.stop();
          setStatus('verified');
          setRecording(false);
          // Small delay so user sees "Verified" state securely
          setTimeout(() => {
            onConfirm();
          }, 1000);
        }
      };

      recognize.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
           setStatus('error');
           setRecording(false);
        }
      };

      recognize.onend = () => {
        if (status === 'listening') {
          setRecording(false);
          setStatus('idle');
        }
      };

      recognize.start();
    } catch (e) {
       console.error(e);
       setStatus('error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      setStatus('idle');
    }
  };

  return (
    <Card className="border-border bg-slate-800 border-slate-700">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-white">Voice Confirmation (India First!)</span>
        </div>
        
        <p className="text-sm text-slate-400">
          Try saying: <span className="text-white font-medium">"{LANGUAGE_MAP[selectedLang]?.phrases[0]}"</span>
        </p>

        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <Button
              key={lang}
              variant="outline"
              size="sm"
              className={selectedLang === lang ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'}
              onClick={() => {
                setSelectedLang(lang);
                stopListening();
              }}
              disabled={recording || status === 'verified'}
            >
              {lang}
            </Button>
          ))}
        </div>

        {transcript && status === 'listening' && (
          <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg animate-in fade-in zoom-in duration-300">
            <p className="text-sm text-blue-400 italic">Listening: "{transcript}..."</p>
          </div>
        )}

        {status === 'verified' && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
             <CheckCircle2 className="w-5 h-5 text-green-400" />
             <p className="text-sm text-green-400 font-medium">Voice matched! Processing payment...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
             <p className="text-sm text-red-400 text-center">Microphone permission denied or unsupported device.</p>
          </div>
        )}

        <Button
          className={`w-full transition-colors ${status === 'verified' ? 'bg-green-600 hover:bg-green-700' : recording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          onClick={recording ? stopListening : startListening}
          disabled={status === 'verified' || status === 'error'}
        >
          {status === 'verified' ? (
             <>
               <CheckCircle2 className="w-4 h-4 mr-2" /> Verified
             </>
          ) : recording ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Recording... Tap to stop
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Start Voice Confirmation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
