'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

import { DashboardRecentTransaction } from '@/app/dashboard/page';

interface FraudScoreCardProps {
  recentTransactions?: DashboardRecentTransaction[];
}

export function FraudScoreCard({ recentTransactions = [] }: FraudScoreCardProps) {
  // Extract and calculate the global average predictive fraud score
  const validScores = recentTransactions.map(t => t.fraud_score).filter(s => s !== undefined) as number[];
  const score = validScores.length > 0 
    ? Math.round(validScores.reduce((acc,s) => acc + s, 0) / validScores.length)
    : 0; // exactly 0 if no scores available
    
  const getLabel = () => {
    if (validScores.length === 0) return 'Pending Live Data';
    if (score <= 30) return 'Low Risk Average';
    if (score <= 60) return 'Med Risk Average';
    return 'High Risk Warning';
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Predictive Fraud Score (PFS)
        </CardTitle>
        <CardDescription>Explainable AI • 0-100 scale</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
                strokeDasharray={`${score}, 100`}
                className={`text-${score <= 30 ? 'green' : score <= 60 ? 'yellow' : 'red'}-500`}
                stroke="currentColor"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {score}
            </span>
          </div>
          <div>
            <Badge variant={score <= 30 ? 'default' : score <= 60 ? 'secondary' : 'destructive'}>{getLabel()}</Badge>
            <p className="text-sm text-muted-foreground mt-1">Based on {validScores.length} recent queries</p>
            {validScores.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                <li>• Global aggregate metric</li>
                <li>• Realtime ML model evaluated</li>
              </ul>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
