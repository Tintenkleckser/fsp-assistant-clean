import { notFound, redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { ChatClient } from './chat-client';

export const dynamic = 'force-dynamic';

export default async function ChatPage({
  params,
  searchParams
}: {
  params: { templateId: string };
  searchParams: { simId?: string };
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const simulation = await prisma.userSimulation.findFirst({
    where: {
      id: searchParams.simId ?? '',
      userId: user.id,
      templateId: params.templateId
    },
    include: {
      template: true,
      interactions: { orderBy: { turnNumber: 'asc' } }
    }
  });

  if (!simulation) {
    notFound();
  }

  return (
    <ChatClient
      simId={simulation.id}
      templateId={simulation.templateId}
      title={simulation.template.titleDe}
      titleTr={simulation.template.titleTr}
      description={simulation.template.descriptionDe}
      descriptionTr={simulation.template.descriptionTr}
      maxTurns={simulation.template.maxTurns}
      timeLimitMinutes={simulation.template.timeLimitMinutes}
      languageMode={simulation.languageMode}
      startedAt={simulation.startedAt.toISOString()}
      initialInteractions={simulation.interactions}
    />
  );
}
