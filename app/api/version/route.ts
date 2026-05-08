import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    app: 'fsp-assistant-clean',
    expectedCommit: '18de3b5-or-newer',
    expectedFix: 'dual Supabase SSR cookie adapter',
    vercelCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deployedAt: new Date().toISOString()
  });
}
