'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Code, BookOpen, Zap, Key, Webhook, Search, ChevronRight, Copy, Check } from 'lucide-react';

export default function DocsPage() {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const docSections = [
    {
      title: 'Getting Started',
      icon: Zap,
      items: [
        { title: 'Introduction', href: '#intro' },
        { title: 'Authentication', href: '#auth' },
        { title: 'API Keys', href: '#keys' },
      ],
    },
    {
      title: 'Payments',
      icon: Code,
      items: [
        { title: 'Create Payment', href: '#create' },
        { title: 'List Payments', href: '#list' },
        { title: 'Refund Payment', href: '#refund' },
      ],
    },
    {
      title: 'Webhooks',
      icon: Webhook,
      items: [
        { title: 'Overview', href: '#webhook-overview' },
        { title: 'Event Types', href: '#events' },
        { title: 'Webhook Signing', href: '#signing' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Zap className="w-5 h-5 text-accent" />
            PaymentGateway Docs
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-accent hover:bg-accent/90">Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <div className="mb-12">
          <div className="relative max-w-xl mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-6 text-base bg-card border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {docSections.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j}>
                        <Link
                          href={item.href}
                          className="text-sm text-muted-foreground hover:text-accent transition flex items-center gap-2"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Introduction */}
            <section id="intro" className="scroll-mt-20">
              <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to PaymentGateway API</h2>
              <p className="text-muted-foreground mb-6">
                The PaymentGateway API allows you to integrate payment processing into your application with ease.
                Our API is RESTful and returns JSON responses.
              </p>
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Base URL</h3>
                <code className="text-sm text-accent block bg-slate-900/50 p-3 rounded">
                  https://api.paymentgateway.com/v1
                </code>
              </div>
            </section>

            {/* Authentication */}
            <section id="auth" className="scroll-mt-20">
              <h2 className="text-3xl font-bold text-foreground mb-4">Authentication</h2>
              <p className="text-muted-foreground mb-6">
                All requests must include an Authorization header with your API key.
              </p>
              <div className="bg-card border border-border rounded-lg p-6 space-y-4 mb-4">
                <h3 className="font-semibold text-foreground text-sm">Example Request</h3>
                <div className="bg-slate-900/50 rounded p-4 relative">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
{`curl https://api.paymentgateway.com/v1/payments \\
  -H "Authorization: Bearer pk_live_xyz" \\
  -H "Content-Type: application/json"`}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCode('curl https://api.paymentgateway.com/v1/payments \\\n  -H "Authorization: Bearer pk_live_xyz" \\\n  -H "Content-Type: application/json"')}
                    className="absolute top-2 right-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </section>

            {/* API Keys */}
            <section id="keys" className="scroll-mt-20">
              <h2 className="text-3xl font-bold text-foreground mb-4">API Keys</h2>
              <p className="text-muted-foreground mb-6">
                Secure your API keys in your environment variables. Never expose them in client-side code.
              </p>
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    <strong>Tip:</strong> Use different API keys for development (test mode) and production (live mode).
                  </p>
                </div>
                <code className="text-sm text-accent block bg-slate-900/50 p-3 rounded">
                  NEXT_PUBLIC_API_KEY=pk_test_xyz
                </code>
              </div>
            </section>

            {/* Create Payment */}
            <section id="create" className="scroll-mt-20">
              <h2 className="text-3xl font-bold text-foreground mb-4">Create Payment</h2>
              <p className="text-muted-foreground mb-6">
                Create a new payment intent.
              </p>
              <div className="bg-card border border-border rounded-lg p-6 space-y-4 mb-4">
                <h3 className="font-semibold text-foreground">Endpoint</h3>
                <code className="text-sm text-accent block bg-slate-900/50 p-3 rounded">
                  POST /v1/payments
                </code>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Request Body</h3>
                <div className="bg-slate-900/50 rounded p-4 relative">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
{`{
  "amount": 5999,
  "currency": "INR",
  "description": "Premium Subscription",
  "customer_email": "user@example.com",
  "return_url": "https://yoursite.com/success"
}`}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCode('{\n  "amount": 5999,\n  "currency": "INR",\n  "description": "Premium Subscription",\n  "customer_email": "user@example.com",\n  "return_url": "https://yoursite.com/success"\n}')}
                    className="absolute top-2 right-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </section>

            {/* Webhooks */}
            <section id="webhook-overview" className="scroll-mt-20">
              <h2 className="text-3xl font-bold text-foreground mb-4">Webhooks</h2>
              <p className="text-muted-foreground mb-6">
                Webhooks allow you to be notified of events that happen in your PaymentGateway account.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Common Events</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="text-muted-foreground">
                      <strong className="text-foreground">payment.completed</strong> - Payment successfully processed
                    </li>
                    <li className="text-muted-foreground">
                      <strong className="text-foreground">payment.failed</strong> - Payment processing failed
                    </li>
                    <li className="text-muted-foreground">
                      <strong className="text-foreground">payment.refunded</strong> - Payment was refunded
                    </li>
                    <li className="text-muted-foreground">
                      <strong className="text-foreground">settlement.completed</strong> - Settlement processed
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SDKs */}
            <section className="scroll-mt-20">
              <h2 className="text-3xl font-bold text-foreground mb-4">SDKs & Libraries</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Node.js', lang: 'npm install paymentgateway' },
                  { name: 'Python', lang: 'pip install paymentgateway' },
                  { name: 'Go', lang: 'go get github.com/paymentgateway/go-sdk' },
                  { name: 'Ruby', lang: 'gem install paymentgateway' },
                ].map((sdk, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">{sdk.name}</h4>
                    <code className="text-xs text-accent bg-slate-900/50 p-2 rounded block">{sdk.lang}</code>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
