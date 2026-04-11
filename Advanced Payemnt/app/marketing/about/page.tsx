'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-xl text-foreground">PaymentGateway</Link>
          <div className="flex gap-4">
            <Link href="/marketing"><Button variant="ghost">Home</Button></Link>
            <Link href="/marketing/features"><Button variant="ghost">Features</Button></Link>
            <Link href="/marketing/pricing"><Button variant="ghost">Pricing</Button></Link>
            <Link href="/marketing/about"><Button variant="ghost">About</Button></Link>
            <Link href="/dashboard"><Button>Dashboard</Button></Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            India&apos;s most intelligent payment gateway
          </h1>
          <p className="text-xl text-muted-foreground">
            We&apos;re building the future of payments—faster, smarter, and more reliable for merchants of all sizes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-border">
            <CardContent className="pt-6 text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Secure by default</h3>
              <p className="text-sm text-muted-foreground">PCI-DSS compliant infrastructure with end-to-end encryption</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6 text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Built for speed</h3>
              <p className="text-sm text-muted-foreground">Sub-100ms payment processing with 99.9% uptime</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6 text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">10,000+ merchants</h3>
              <p className="text-sm text-muted-foreground">Trusted by businesses across India</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/signup">
            <Button size="lg">Join us</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
