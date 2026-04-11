'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Shield } from 'lucide-react';

interface BlockchainVerificationProps {
  transactionHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
}

export function BlockchainVerification({
  transactionHash = '0x7a3f...9d2e',
  blockNumber = 1847291,
  explorerUrl = 'https://explorer.example.com',
}: BlockchainVerificationProps) {
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
        <div className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
          {transactionHash}
        </div>
        <p className="text-xs text-muted-foreground">Block #{blockNumber}</p>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <Link2 className="w-4 h-4 mr-2" />
            View on Explorer
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
