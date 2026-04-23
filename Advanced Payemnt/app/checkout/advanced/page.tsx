import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdvancedGlobalCheckout } from '@/components/checkout/advanced-global-checkout';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Advanced checkout — India & global | Advanced Pay',
  description:
    'India-first and international checkout: GST, DPDP consent, UPI/RuPay, and global card rails in one flow.',
};

export default function AdvancedCheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-foreground">
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-300 hover:text-white">
            <Link href="/checkout">
              <ArrowLeft className="h-4 w-4" />
              Standard checkout
            </Link>
          </Button>
          <p className="text-xs font-medium uppercase tracking-widest text-blue-300/90">
            Advanced Pay · Unified commerce
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <AdvancedGlobalCheckout />
      </div>
    </div>
  );
}
