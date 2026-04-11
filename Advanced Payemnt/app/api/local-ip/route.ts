import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const inline of interfaces[name] || []) {
      // Find the IPv4 address that is not internal
      if (inline.family === 'IPv4' && !inline.internal) {
        localIp = inline.address;
        break;
      }
    }
  }

  return NextResponse.json({ ip: localIp });
}
