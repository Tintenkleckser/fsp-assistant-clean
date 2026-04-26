import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    app: 'fsp-assistant-clean',
    expectedCommit: '1a8bcdb-dashboard-v3',
    vercelCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deployedAt: new Date().toISOString()
  });
}
