'use client';

import { Badge } from '@/components/ui/badge';
import { Mic, Play } from 'lucide-react';

interface VoicePaymentBadgeProps {
  language?: string;
  verified?: boolean;
  transactionId?: string;
}

export function VoicePaymentBadge({
  language = 'Hindi',
  verified = true,
  transactionId,
}: VoicePaymentBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Mic className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Voice Biometric Verified</span>
          {verified && (
            <Badge variant="secondary" className="text-xs">Verified</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Language: {language}</p>
      </div>
      <button className="p-1 rounded hover:bg-muted" title="Play recording">
        <Play className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
