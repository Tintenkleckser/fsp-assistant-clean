import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const requiredEnv = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'MISTRAL_API_KEY'
];

const optionalEnv = ['DIRECT_URL'];

function inspectDatabaseUrl(value: string | undefined) {
  const raw = value ?? '';
  const trimmed = raw.trim();

  return {
    present: raw.length > 0,
    length: raw.length,
    trimmedLength: trimmed.length,
    startsWithPostgres: trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://'),
    startsWithHttps: trimmed.startsWith('https://'),
    startsWithKeyName: trimmed.startsWith('DATABASE_URL='),
    startsWithQuote: trimmed.startsWith('"') || trimmed.startsWith("'"),
    hasLeadingOrTrailingWhitespace: raw !== trimmed
  };
}

export async function GET() {
  const env = Object.fromEntries(
    requiredEnv.map((key) => [key, Boolean(process.env[key])])
  );
  const optional = Object.fromEntries(
    optionalEnv.map((key) => [key, Boolean(process.env[key])])
  );
  const databaseUrl = inspectDatabaseUrl(process.env.DATABASE_URL);

  return NextResponse.json({
    ok: Object.values(env).every(Boolean) && databaseUrl.startsWithPostgres,
    service: 'fsp-assistant-clean',
    env,
    optional,
    databaseUrl,
    timestamp: new Date().toISOString()
  });
}
