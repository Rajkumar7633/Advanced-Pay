import { NextResponse } from 'next/server';

// Razorpay Order Creation API
// Creates a Razorpay order via their REST API so the frontend
// can open the Checkout popup with a real order_id

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_StIu5YDbFSO4Au';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'Wuu6EiAVOiwmNqUjj2KVNqXB';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, currency = 'INR', receipt, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount is required and must be > 0' }, { status: 400 });
    }

    // Razorpay uses paise (multiply by 100)
    const amountPaise = Math.round(Number(amount) * 100);

    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Razorpay order creation failed:', data);
      return NextResponse.json(
        { error: data?.error?.description || 'Failed to create Razorpay order' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key: RAZORPAY_KEY_ID,
    });

  } catch (err: any) {
    console.error('Razorpay order API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
