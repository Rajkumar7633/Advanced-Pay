'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Code, Zap, Webhook, Search, ChevronRight, Copy, Check, Link as LinkIcon, ShieldAlert } from 'lucide-react';

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const docSections = [
    {
      title: 'Getting Started',
      icon: Zap,
      items: [
        { title: 'Introduction', href: '#intro' },
        { title: 'Authentication', href: '#auth' },
      ],
    },
    {
      title: 'Core API',
      icon: Code,
      items: [
        { title: 'Create Payment', href: '#create-payment' },
        { title: 'Capture Payment', href: '#capture-payment' },
        { title: 'Refund Payment', href: '#refund-payment' },
        { title: 'Create Payment Link', href: '#payment-links' },
      ],
    },
    {
      title: 'Webhooks & Events',
      icon: Webhook,
      items: [
        { title: 'Register Webhook', href: '#register-webhook' },
        { title: 'Event Types', href: '#events' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-blue-900/30 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <Zap className="w-5 h-5 text-blue-500" />
            Advanced Pay Docs
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Home</Button>
            </Link>
            <Link href="/merchant/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">Developer Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <div className="mb-12">
          <div className="relative max-w-xl mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Search API documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-6 text-base bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
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
                    <Icon className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-white">{section.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j}>
                        <Link
                          href={item.href}
                          className="text-sm text-slate-400 hover:text-blue-400 transition flex items-center gap-2"
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
          <div className="lg:col-span-3 space-y-16">
            {/* Introduction */}
            <section id="intro" className="scroll-mt-24">
              <h2 className="text-3xl font-bold text-white mb-4">Advanced Pay API Reference</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                The Advanced Pay API allows you to programmatically process payments, generate payment links, and manage refunds.
                Our API is designed around REST conventions, accepting JSON payloads and returning standard JSON responses.
              </p>
              <div className="bg-slate-900 border border-blue-900/30 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-3">Base URL</h3>
                <code className="text-sm text-blue-400 block bg-black/40 p-3 rounded-lg border border-white/5">
                  https://api.advancedpay.com/api/v1
                </code>
              </div>
            </section>

            {/* Authentication */}
            <section id="auth" className="scroll-mt-24">
              <h2 className="text-3xl font-bold text-white mb-4">Authentication</h2>
              <p className="text-slate-400 mb-6">
                Authenticate your API requests by providing your Merchant API Key via the <code className="text-blue-400">Authorization</code> HTTP header.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6 flex gap-4">
                <ShieldAlert className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-200">
                  <strong>Security Note:</strong> Your API keys carry high privileges. Never expose them in client-side code (like React/Next.js frontend code) or commit them to GitHub. Always use them from a secure backend server.
                </p>
              </div>
              <div className="bg-slate-900 border border-blue-900/30 rounded-xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">cURL Example</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => copyCode('Authorization: Bearer mid_live_xxxxxxxx', 'auth')}>
                    {copied === 'auth' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300 font-mono">
                    <span className="text-pink-400">curl</span> https://api.advancedpay.com/api/v1/payments \<br/>
                    {'  '}-H <span className="text-green-400">"Authorization: Bearer mid_live_xxxxxxxx"</span>
                  </pre>
                </div>
              </div>
            </section>

            {/* Create Payment */}
            <section id="create-payment" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold font-mono">POST</span>
                <h2 className="text-2xl font-bold text-white">Create Payment</h2>
              </div>
              <p className="text-slate-400 mb-6">
                Initialize a direct payment intent. Depending on the payment method, this might require a subsequent capture request.
              </p>
              <div className="bg-slate-900 border border-blue-900/30 rounded-xl overflow-hidden mb-6">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">Endpoint</span>
                </div>
                <div className="p-4">
                  <code className="text-sm text-slate-300">/api/v1/payments</code>
                </div>
              </div>

              <h3 className="font-semibold text-white mb-3">Request Payload</h3>
              <div className="bg-slate-900 border border-blue-900/30 rounded-xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">JSON</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => copyCode(`{\n  "order_id": "ORD_99485",\n  "amount": 599.00,\n  "currency": "INR",\n  "payment_method": "upi",\n  "customer_email": "john@example.com",\n  "customer_phone": "9876543210"\n}`, 'create')}>
                    {copied === 'create' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300 font-mono">
{`{
  "order_id": "ORD_99485",
  "amount": 599.00,
  "currency": "INR",
  "payment_method": "upi",      // "upi" or "card"
  "customer_email": "john@example.com",
  "customer_phone": "9876543210"
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Payment Links */}
            <section id="payment-links" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold font-mono">POST</span>
                <h2 className="text-2xl font-bold text-white">Create Payment Link</h2>
              </div>
              <p className="text-slate-400 mb-6">
                Generate a hosted checkout URL to securely accept payments from customers without building a UI.
              </p>
              
              <div className="bg-slate-900 border border-blue-900/30 rounded-xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">JSON Request (/api/v1/payment-links)</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => copyCode(`{\n  "amount": 1499.00,\n  "description": "Annual Premium Plan"\n}`, 'link')}>
                    {copied === 'link' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300 font-mono">
{`{
  "amount": 1499.00,
  "description": "Annual Premium Plan"
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Webhooks */}
            <section id="register-webhook" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold font-mono">POST</span>
                <h2 className="text-2xl font-bold text-white">Register Webhook</h2>
              </div>
              <p className="text-slate-400 mb-6">
                Webhooks allow your system to be notified asynchronously when events happen in your Advanced Pay account.
              </p>
              
              <div className="bg-slate-900 border border-blue-900/30 rounded-xl overflow-hidden mb-12">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">JSON Request (/api/v1/webhooks)</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => copyCode(`{\n  "url": "https://api.yourdomain.com/callbacks/advanced-pay",\n  "events": ["payment.success", "payment.failed"]\n}`, 'wh')}>
                    {copied === 'wh' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300 font-mono">
{`{
  "url": "https://api.yourdomain.com/callbacks/advanced-pay",
  "events": [
    "payment.success", 
    "payment.failed"
  ]
}`}
                  </pre>
                </div>
              </div>

              <h3 id="events" className="text-xl font-bold text-white mb-4 scroll-mt-24">Supported Event Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'payment.success', desc: 'Triggered when a payment is fully captured and funds are secured.' },
                  { name: 'payment.failed', desc: 'Triggered when a transaction is declined or blocked by fraud rules.' },
                  { name: 'payment.refunded', desc: 'Triggered when a full or partial refund is completed.' },
                  { name: 'dispute.created', desc: 'Triggered when a customer initiates a chargeback.' },
                ].map((ev, i) => (
                  <div key={i} className="bg-slate-900 border border-blue-900/20 rounded-xl p-5">
                    <code className="text-sm text-blue-400 font-bold mb-2 block">{ev.name}</code>
                    <p className="text-sm text-slate-400">{ev.desc}</p>
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
