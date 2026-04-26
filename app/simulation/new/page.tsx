import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { NewSimulationForm } from './new-simulation-form';

export const dynamic = 'force-dynamic';

export default async function NewSimulationPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const recentTemplates = await prisma.simulationTemplate.findMany({
    orderBy: { titleDe: 'asc' },
    take: 8
  }).catch(() => []);

  return <NewSimulationForm recentTemplates={recentTemplates} />;
}
