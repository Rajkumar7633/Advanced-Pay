'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '1.9%',
    desc: '+ ₹2 per transaction',
    features: ['Up to ₹5L monthly', 'Cards & UPI', 'Basic support', 'Dashboard access'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Professional',
    price: '1.5%',
    desc: '+ ₹2 per transaction',
    features: ['Up to ₹50L monthly', 'All payment methods', 'Priority support', 'API access', 'Webhooks'],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Volume-based pricing',
    features: ['Unlimited volume', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'Fraud detection'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
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
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No setup fees. No hidden charges. Pay only when you earn.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`border-border ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              <CardHeader>
                {plan.popular && (
                  <span className="text-xs font-medium text-primary mb-2">MOST POPULAR</span>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="ml-1">{plan.desc}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
