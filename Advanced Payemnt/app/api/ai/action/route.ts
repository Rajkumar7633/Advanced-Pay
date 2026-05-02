import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';

// Map AI action types to backend API endpoints
const ACTION_MAP: Record<string, (params: any, token: string) => Promise<Response>> = {

  REFUND_TRANSACTION: (params, token) =>
    fetch(`${BACKEND_URL}/api/v1/admin/transactions/${params.id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }),

  SUSPEND_MERCHANT: (params, token) =>
    fetch(`${BACKEND_URL}/api/v1/admin/merchants/${params.id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' })
    }),

  APPROVE_MERCHANT: (params, token) =>
    fetch(`${BACKEND_URL}/api/v1/admin/merchants/${params.id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' })
    }),

  RESOLVE_DISPUTE: (params, token) =>
    fetch(`${BACKEND_URL}/api/v1/admin/disputes/${params.id}/resolve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: params.outcome || 'closed' })
    }),

  APPROVE_SETTLEMENT: (params, token) =>
    fetch(`${BACKEND_URL}/api/v1/admin/settlements/${params.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }),
};

export async function POST(req: Request) {
  try {
    const { actionType, params, adminToken } = await req.json();

    if (!actionType || !params) {
      return NextResponse.json({ error: 'Missing actionType or params.' }, { status: 400 });
    }

    const executor = ACTION_MAP[actionType];
    if (!executor) {
      return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 });
    }

    const token = adminToken || '';
    const backendRes = await executor(params, token);

    if (!backendRes.ok) {
      const errBody = await backendRes.text();
      console.error(`AI Action [${actionType}] failed:`, errBody);
      return NextResponse.json(
        { error: `Backend rejected the action: ${backendRes.statusText}` },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({ success: true, actionType, params });

  } catch (err: any) {
    console.error('AI Action Route Error:', err);
    return NextResponse.json({ error: 'Action execution failed internally.' }, { status: 500 });
  }
}
