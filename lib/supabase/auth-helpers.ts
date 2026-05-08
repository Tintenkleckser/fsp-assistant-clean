import type { User } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { createClient } from './server';

export async function getAuthUser() {
  let user: User;

  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
      error
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return null;
    }

    user = authUser;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("project's URL and Key are required")
    ) {
      return null;
    }

    throw error;
  }

  let profile = await prisma.profile.findUnique({
    where: { id: user.id }
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email ?? '',
        nativeLanguage: 'tr'
      }
    });
  }

  return {
    id: user.id,
    email: user.email ?? profile.email,
    nativeLanguage: profile.nativeLanguage,
    targetRegionId: profile.targetRegionId
  };
}
