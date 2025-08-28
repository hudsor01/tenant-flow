import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'frontend',
    environment: process.env.NODE_ENV || 'production'
  });
}

// Support HEAD requests for faster health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}