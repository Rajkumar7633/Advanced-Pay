'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';

interface SmartRetryWidgetProps {
  suggestedMethod: string;
  successChance: number;
  reason?: string;
  onRetry: (method: string) => void;
}

export function SmartRetryWidget({
  suggestedMethod,
  successChance,
  reason,
  onRetry,
}: SmartRetryWidgetProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Auto-Retry Intelligence</p>
            <p className="text-sm text-muted-foreground mt-1">
              This payment has <span className="font-semibold text-amber-600">{successChance}%</span> chance of success with {suggestedMethod}
            </p>
            {reason && (
              <p className="text-xs text-muted-foreground mt-1">{reason}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onRetry(suggestedMethod)}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Switch to {suggestedMethod}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
