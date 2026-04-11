'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Shield, TrendingUp, Code, Smartphone, Globe } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Process payments in milliseconds with our optimized infrastructure and global edge network.',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'PCI-DSS compliant with end-to-end encryption, 3D Secure, and fraud protection.',
  },
  {
    icon: TrendingUp,
    title: 'Real-Time Analytics',
    description: 'Monitor transactions, revenue, success rates, and key metrics in real-time.',
  },
  {
    icon: Code,
    title: 'Easy Integration',
    description: 'Simple REST API with SDKs for JavaScript, Python, PHP, Go, and mobile platforms.',
  },
  {
    icon: Smartphone,
    title: 'UPI & Cards',
    description: 'Accept all major payment methods: cards, UPI, net banking, and digital wallets.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description: 'Support INR and 20+ currencies with automatic conversion and localized checkout.',
  },
];

export default function FeaturesPage() {
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
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built for modern commerce
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to accept payments, manage transactions, and grow your business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="border-border">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <Link href="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
