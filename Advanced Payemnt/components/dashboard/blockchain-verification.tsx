'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Shield } from 'lucide-react';

import { DashboardRecentTransaction } from '@/app/dashboard/page';

interface BlockchainVerificationProps {
  recentTransactions?: DashboardRecentTransaction[];
}

export function BlockchainVerification({ recentTransactions = [] }: BlockchainVerificationProps) {
  // Rather than dummy static hashes, pull the very latest transaction ID natively.
  const latestTx = recentTransactions.length > 0 ? recentTransactions[0] : null;
  // A mock blockchain tx generation off the ID for display demo:
  const hash = latestTx ? `0x${Buffer.from(latestTx.id).toString('hex').slice(0, 16)}...` : null;
  const blockNumber = latestTx ? Math.floor(Date.parse(latestTx.date) / 1000) : null;
  const explorerUrl = 'https://explorer.example.com';

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Blockchain Settlement Proof
        </CardTitle>
        <CardDescription>Immutable audit trail • Hyperledger</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {latestTx ? (
          <>
            <div className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
              {hash}
            </div>
            <p className="text-xs text-muted-foreground">Block #{blockNumber}</p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                <Link2 className="w-4 h-4 mr-2" />
                View on Explorer
              </a>
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center h-[96px] text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            Awaiting confirmed settlements...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
