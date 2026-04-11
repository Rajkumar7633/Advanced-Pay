'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Code, 
  Globe,
  ArrowRight,
  CheckCircle,
  Users,
  BarChart3,
  Smartphone
} from 'lucide-react';

export default function MarketingPage() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Process payments in milliseconds with our optimized infrastructure',
    },
    {
      icon: ShieldCheck,
      title: 'Bank-Level Security',
      description: 'PCI-DSS compliant with end-to-end encryption and fraud protection',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Analytics',
      description: 'Monitor transactions, revenue, and key metrics in real-time',
    },
    {
      icon: Code,
      title: 'Easy Integration',
      description: 'Simple REST API with SDKs for all popular programming languages',
    },
    {
      icon: Globe,
      title: 'Multi-Currency',
      description: 'Support for multiple payment methods and currencies globally',
    },
    {
      icon: Users,
      title: 'Expert Support',
      description: '24/7 dedicated support to help you succeed',
    },
  ];

  const testimonials = [
    {
      name: 'Rajesh Kumar',
      company: 'TechStart India',
      image: '👨‍💼',
      quote: 'PaymentGateway transformed our payment processing. We went from manual reconciliation to fully automated within days.',
    },
    {
      name: 'Priya Singh',
      company: 'E-Commerce Pro',
      image: '👩‍💼',
      quote: 'The checkout experience is seamless. Our conversion rates improved by 15% after switching to PaymentGateway.',
    },
    {
      name: 'Arjun Patel',
      company: 'SaaS Solutions',
      image: '👨‍💻',
      quote: 'Best payment gateway API I\'ve used. Documentation is excellent and the support team is incredibly responsive.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '₹0',
      description: 'Perfect for small businesses',
      features: [
        'Up to 1,000 transactions/month',
        '1.9% + 1 transaction fee',
        'Email support',
        'Basic analytics',
      ],
    },
    {
      name: 'Professional',
      price: '₹999',
      description: 'For growing businesses',
      features: [
        'Up to 50,000 transactions/month',
        '1.5% + 1 transaction fee',
        'Priority support',
        'Advanced analytics',
        'Custom integration',
      ],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For high-volume operations',
      features: [
        'Unlimited transactions',
        'Custom pricing',
        'Dedicated account manager',
        'Custom integration',
        'SLA guarantee',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-300"></div>
            PaymentGateway
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
            <a href="/docs" className="text-gray-300 hover:text-white transition">Docs</a>
          </div>
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Modern Payment <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Processing</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Accept payments from customers worldwide with our fast, secure, and reliable payment gateway.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/checkout">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Try Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="border-gray-400 text-gray-200">
                View Documentation
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">₹1000 Cr+</div>
              <div className="text-gray-300">Processed Annually</div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
              <div className="text-gray-300">Uptime Guarantee</div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">10,000+</div>
              <div className="text-gray-300">Active Merchants</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-300">Everything you need to manage payments efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-8 hover:border-blue-500/50 transition">
                <Icon className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl">
        <h2 className="text-4xl font-bold text-center mb-16">Loved by Merchants</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.company}</p>
                </div>
              </div>
              <p className="text-gray-300 italic">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-xl text-gray-300">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-lg p-8 transition ${
                plan.highlighted
                  ? 'bg-blue-600 border-2 border-blue-400 scale-105'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-300 mb-4">{plan.description}</p>
              <div className="text-3xl font-bold mb-6">{plan.price}</div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.highlighted ? 'default' : 'outline'}>
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl text-gray-300 mb-8">Join thousands of merchants already using PaymentGateway</p>
        <Link href="/dashboard">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Create Account Now <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-400 text-sm">
              © 2024 PaymentGateway. All rights reserved.
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
