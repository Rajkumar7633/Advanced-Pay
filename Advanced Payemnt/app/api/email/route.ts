import { NextResponse } from 'next/server';

// Email sending via Resend API
// Sign up free at https://resend.com to get an API key
// Set RESEND_API_KEY in .env.local

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Advanced Pay <noreply@advancedpay.in>';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, html, type } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required fields: to, subject' }, { status: 400 });
    }

    // If no Resend key, log and return success (dev mode)
    if (!RESEND_API_KEY) {
      console.log(`[EMAIL DEV MODE] To: ${to} | Subject: ${subject}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Email logged (dev mode — add RESEND_API_KEY to .env.local to send real emails)',
        id: 'dev_' + Date.now()
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return NextResponse.json({ error: 'Failed to send email', details: data }, { status: 502 });
    }

    return NextResponse.json({ success: true, id: data.id });

  } catch (err: any) {
    console.error('Email route error:', err);
    return NextResponse.json({ error: 'Internal email error' }, { status: 500 });
  }
}
