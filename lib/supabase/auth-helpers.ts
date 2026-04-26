import { prisma } from '@/lib/db';
import { createClient } from './server';

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
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
    nativeLanguage: profile.nativeLanguage
  };
}
