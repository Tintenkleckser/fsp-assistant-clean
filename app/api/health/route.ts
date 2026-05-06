import { NextResponse } from 'next/server';
import { inspectDatabaseUrl } from '@/lib/database-url';

export const dynamic = 'force-dynamic';

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'MISTRAL_API_KEY'
];

const optionalEnv = ['DATABASE_URL', 'SUPABASE_DATABASE_URL', 'DATABASE_URL_OVERRIDE', 'POSTGRES_PRISMA_URL', 'DIRECT_URL'];

export async function GET() {
  const env = Object.fromEntries(
    requiredEnv.map((key) => [key, Boolean(process.env[key])])
  );
  const optional = Object.fromEntries(
    optionalEnv.map((key) => [key, Boolean(process.env[key])])
  );
  const databaseUrl = inspectDatabaseUrl();

  return NextResponse.json({
    ok: Object.values(env).every(Boolean) && databaseUrl.startsWithPostgres,
    service: 'fsp-assistant-clean',
    env,
    optional,
    databaseUrl,
    timestamp: new Date().toISOString()
  });
}
