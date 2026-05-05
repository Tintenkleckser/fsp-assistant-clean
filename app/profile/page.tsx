import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { ProfileClient } from './profile-client';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();
  const metadata = authUser?.user_metadata ?? {};
  const [profile, regions] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { targetRegionId: true }
    }),
    prisma.fspRegion.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        summary: true,
        verificationStatus: true
      }
    }).catch(() => [])
  ]);

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">Profil</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Lernkonto und KI-Coach</h1>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Dashboard
          </Link>
        </header>

        <ProfileClient
          email={user.email}
          initialName={typeof metadata.full_name === 'string' ? metadata.full_name : ''}
          initialAvatarUrl={typeof metadata.avatar_url === 'string' ? metadata.avatar_url : ''}
          initialTargetRegionId={profile?.targetRegionId ?? ''}
          regions={regions}
        />
      </div>
    </main>
  );
}
