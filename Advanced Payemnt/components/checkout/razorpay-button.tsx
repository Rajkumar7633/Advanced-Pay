'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayButtonProps {
  amount: number; // in INR (will be converted to paise internally)
  currency?: string;
  description?: string;
  merchantName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess?: (response: RazorpayResponse) => void;
  onFailure?: (error: any) => void;
  className?: string;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayButton({
  amount,
  currency = 'INR',
  description = 'Payment via Advanced Pay',
  merchantName = 'Advanced Pay',
  prefillEmail = '',
  prefillPhone = '',
  onSuccess,
  onFailure,
  className = '',
  children,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount before paying.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Load Razorpay Checkout.js
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Failed to load Razorpay. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // Step 2: Create a real Razorpay order via our Next.js API route
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          receipt: `rcpt_${Date.now()}`,
          notes: { description },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        alert('Failed to create payment order: ' + (orderData.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      // Step 3: Open Razorpay Checkout with the real order_id
      const options = {
        key: orderData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_StIu5YDbFSO4Au',
        amount: orderData.amount,     // already in paise from server
        currency: orderData.currency,
        order_id: orderData.order_id, // real Razorpay order ID
        name: merchantName,
        description,
        image: '/favicon.ico',
        prefill: {
          email: prefillEmail,
          contact: prefillPhone,
        },
        theme: {
          color: '#6366f1',
          hide_topbar: false,
        },
        modal: {
          confirm_close: true,
          animation: true,
        },
        handler: (response: RazorpayResponse) => {
          setLoading(false);
          onSuccess?.(response);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (error: any) => {
        setLoading(false);
        // Only call onFailure for real payment failures, not user dismiss
        const code = error?.error?.code || '';
        if (code === 'PAYMENT_CANCELLED' || code === 'BAD_REQUEST_ERROR') {
          // User closed or cancelled — pass the error for custom handling
          onFailure?.(error);
        } else {
          onFailure?.(error);
        }
      });

      setLoading(false);
      rzp.open();
    } catch (err) {
      setLoading(false);
      console.error('RazorpayButton error:', err);
      onFailure?.(err);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading || !amount || amount <= 0}
      className={className}
    >
      {loading ? (
        <span className="flex items-center gap-2 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Opening Razorpay...
        </span>
      ) : (
        children ?? 'Pay with Razorpay'
      )}
    </button>
  );
}
