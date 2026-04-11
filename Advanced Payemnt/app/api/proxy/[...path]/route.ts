/**
 * API Proxy - Forwards frontend requests to Golang backend
 * Enables seamless integration when backend runs on different port
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  // Forward to /api/v1 for authenticated backend routes
  const url = new URL(`/api/v1/${pathString}`, API_URL);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const auth = request.headers.get('authorization');
    const res = await fetch(url.toString(), {
      headers: auth ? { Authorization: auth } : {},
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'API unreachable' }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  // Forward to /api/v1 for authenticated backend routes
  const url = `${API_URL}/api/v1/${pathString}`;

  try {
    const auth = request.headers.get('authorization');
    const body = await request.text();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: body || undefined,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'API unreachable' }, { status: 502 });
  }
}
