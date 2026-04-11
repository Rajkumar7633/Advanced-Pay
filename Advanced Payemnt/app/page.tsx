'use client';

import Link from 'next/link';
import { ArrowRight, Zap, ShieldCheck, TrendingUp, Code, Settings, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const applications = [
    {
      title: 'Merchant Dashboard',
      description: 'Manage transactions, analytics, payouts, and account settings',
      icon: TrendingUp,
      href: '/dashboard',
      color: 'from-blue-500 to-blue-600',
      features: ['Real-time analytics', 'Settlement tracking', 'Transaction management'],
    },
    {
      title: 'Checkout Widget',
      description: 'Customer-facing payment interface with multiple payment methods',
      icon: CreditCard,
      href: '/checkout',
      color: 'from-green-500 to-green-600',
      features: ['Card payments', 'UPI QR codes', 'Multi-currency support'],
    },
    {
      title: 'Marketing Website',
      description: 'Public-facing landing page and company information',
      icon: Zap,
      href: '/marketing',
      color: 'from-purple-500 to-purple-600',
      features: ['Features showcase', 'Pricing plans', 'Customer testimonials'],
    },
    {
      title: 'Developer Docs',
      description: 'Complete API documentation and integration guides',
      icon: Code,
      href: '/docs',
      color: 'from-orange-500 to-orange-600',
      features: ['API reference', 'Code examples', 'Webhook documentation'],
    },
    {
      title: 'Admin Panel',
      description: 'Internal operations and system monitoring dashboard',
      icon: Settings,
      href: '/admin',
      color: 'from-red-500 to-red-600',
      features: ['Merchant management', 'Dispute resolution', 'System analytics'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Enterprise-Grade Payment Gateway</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Modern Payment <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Processing Platform</span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Fast, secure, and reliable payment gateway with real-time analytics, 
              multiple payment methods, and comprehensive merchant tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Sign In <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="border-gray-400 text-gray-200 hover:bg-gray-800/50">
                  Dashboard
                </Button>
              </Link>
              <Link href="/marketing">
                <Button variant="outline" size="lg" className="border-gray-400 text-gray-200 hover:bg-gray-800/50">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">₹1000 Cr+</div>
              <div className="text-gray-300">Processed Annually</div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
              <div className="text-gray-300">Uptime Guarantee</div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">10,000+</div>
              <div className="text-gray-300">Active Merchants</div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Grid */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Core Applications
          </h2>
          <p className="text-gray-300 text-lg">
            Comprehensive payment gateway ecosystem with all tools you need
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {applications.map((app, index) => {
            const Icon = app.icon;
            return (
              <Link key={index} href={app.href}>
                <Card className="h-full bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${app.color} p-2.5 mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <CardTitle className="text-white text-lg">{app.title}</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      {app.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-2">
                      {app.features.map((feature, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <Zap className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400 text-sm">Process payments in milliseconds with our optimized infrastructure</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <ShieldCheck className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-white font-semibold mb-2">Bank-Level Security</h3>
            <p className="text-gray-400 text-sm">PCI-DSS compliant with end-to-end encryption and fraud protection</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <TrendingUp className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-white font-semibold mb-2">Real-Time Analytics</h3>
            <p className="text-gray-400 text-sm">Monitor transactions, revenue, and key metrics in real-time</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <Code className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-white font-semibold mb-2">Easy Integration</h3>
            <p className="text-gray-400 text-sm">Simple REST API with SDKs for all popular programming languages</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-400 text-sm">
              © 2024 PaymentGateway. All rights reserved.
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/marketing" className="text-gray-400 hover:text-white text-sm transition">
                About
              </Link>
              <Link href="/docs" className="text-gray-400 hover:text-white text-sm transition">
                Documentation
              </Link>
              <Link href="/marketing/security" className="text-gray-400 hover:text-white text-sm transition">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
