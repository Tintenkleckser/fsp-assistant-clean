import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const requiredEnv = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'MISTRAL_API_KEY'
];

export async function GET() {
  const env = Object.fromEntries(
    requiredEnv.map((key) => [key, Boolean(process.env[key])])
  );

  return NextResponse.json({
    ok: Object.values(env).every(Boolean),
    service: 'fsp-assistant-clean',
    env,
    timestamp: new Date().toISOString()
  });
}
