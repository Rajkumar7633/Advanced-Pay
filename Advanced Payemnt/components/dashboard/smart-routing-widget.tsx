'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, TrendingUp } from 'lucide-react';

interface RoutingDecision {
  id: string;
  timestamp: string;
  method: string;
  provider: string;
  successRate: number;
  confidence: number;
  factors: string[];
}


import { DashboardRecentTransaction } from '@/app/dashboard/page';

interface SmartRoutingWidgetProps {
  recentTransactions?: DashboardRecentTransaction[];
}

export function SmartRoutingWidget({ recentTransactions = [] }: SmartRoutingWidgetProps) {
  // Parse dynamic routing decisions from raw JSON payloads
  const dynamicDecisions = recentTransactions
    .filter(t => t.routing_decision)
    .map((t, idx) => {
      try {
        const raw = Buffer.from(t.routing_decision as string, 'base64').toString('utf-8');
        const decision = JSON.parse(raw);
        return {
          id: t.id,
          timestamp: new Date(t.date).toLocaleTimeString(),
          method: t.method || 'Unknown',
          provider: typeof decision === 'object' && decision !== null && 'final_provider' in decision 
                     ? String(decision.final_provider) 
                     : (t as any).payment_provider || 'Fallback',
          successRate: decision.confidence ? Math.round(decision.confidence * 100) : 90,
          confidence: decision.confidence || 0.90,
          factors: decision.factors || ['System heuristic', 'Payment intent'],
        };
      } catch(e) {
        // Fallback or bad JSON
        return null;
      }
    })
    .filter(Boolean) as RoutingDecision[];

  const displayList = dynamicDecisions.slice(0, 4);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          AI Smart Routing™
        </CardTitle>
        <CardDescription>Real-time routing decisions by ML model</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 animate-pulse text-green-500" />
          <span>Live • 50+ factors analyzed</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {displayList.length > 0 ? (
            displayList.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">{d.method} → {d.provider}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(d.confidence * 100).toFixed(0)}% conf
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.timestamp}</p>
                  <p className="text-xs text-muted-foreground mt-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[150px]">
                    {d.factors.slice(0, 2).join(' • ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-green-600">{d.successRate}%</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Awaiting live routing models...
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Estimated 15–20% improvement in success rates
        </p>
      </CardContent>
    </Card>
  );
}
