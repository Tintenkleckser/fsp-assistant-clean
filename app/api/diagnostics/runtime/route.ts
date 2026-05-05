import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CheckResult = {
  ok: boolean;
  detail?: unknown;
  error?: string;
};

async function runCheck(name: string, check: () => Promise<unknown>): Promise<[string, CheckResult]> {
  try {
    return [name, { ok: true, detail: await check() }];
  } catch (error) {
    return [name, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }];
  }
}

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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  const checks = await Promise.all([
    runCheck('database_connection', async () => {
      const result = await prisma.$queryRaw<Array<{ ok: number }>>`select 1 as ok`;
      return result[0] ?? null;
    }),
    runCheck('profile_table_columns', async () => {
      return prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        select column_name, data_type
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
        order by ordinal_position
      `;
    }),
    runCheck('training_table_counts', async () => {
      const result = await prisma.$queryRaw<Array<{
        fsp_regions: bigint;
        fsp_sources: bigint;
        fsp_exam_parts: bigint;
        fsp_region_requirements: bigint;
      }>>`
        select
          (select count(*) from fsp_regions) as fsp_regions,
          (select count(*) from fsp_sources) as fsp_sources,
          (select count(*) from fsp_exam_parts) as fsp_exam_parts,
          (select count(*) from fsp_region_requirements) as fsp_region_requirements
      `;

      const row = result[0];
      return row ? {
        fspRegions: Number(row.fsp_regions),
        fspSources: Number(row.fsp_sources),
        fspExamParts: Number(row.fsp_exam_parts),
        fspRegionRequirements: Number(row.fsp_region_requirements)
      } : null;
    }),
    runCheck('prisma_profile_lookup', async () => {
      if (!user) {
        return { skipped: true, reason: 'No authenticated Supabase user in this browser session.' };
      }

      return prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          nativeLanguage: true,
          targetRegionId: true
        }
      });
    }),
    runCheck('prisma_dashboard_queries', async () => {
      if (!user) {
        return { skipped: true, reason: 'No authenticated Supabase user in this browser session.' };
      }

      const [templates, simulations] = await Promise.all([
        prisma.simulationTemplate.count(),
        prisma.userSimulation.count({ where: { userId: user.id } })
      ]);

      return { templates, simulations };
    })
  ]);

  const checkObject = Object.fromEntries(checks);
  const ok = Object.values(checkObject).every((check) => check.ok);

  return NextResponse.json({
    ok,
    service: 'fsp-assistant-clean',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    databaseUrl: inspectDatabaseUrl(process.env.DATABASE_URL),
    auth: {
      ok: Boolean(user) && !authError,
      userIdPresent: Boolean(user?.id),
      emailPresent: Boolean(user?.email),
      error: authError?.message ?? null
    },
    checks: checkObject,
    timestamp: new Date().toISOString()
  });
}
