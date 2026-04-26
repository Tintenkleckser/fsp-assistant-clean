import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type ChecklistResult = {
  id?: string;
  fulfilled?: boolean;
  score?: number;
  commentDe?: string;
};

export default async function EvaluationPage({ params }: { params: { simId: string } }) {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const simulation = await prisma.userSimulation.findFirst({
    where: { id: params.simId, userId: user.id },
    include: {
      template: true,
      interactions: { orderBy: { turnNumber: 'asc' } },
      evaluation: true
    }
  });

  if (!simulation || !simulation.evaluation) {
    notFound();
  }

  const scores = simulation.evaluation.scores && typeof simulation.evaluation.scores === 'object'
    ? simulation.evaluation.scores as Record<string, number>
    : {};
  const scoreEntries = Object.entries(scores);
  const average = scoreEntries.length > 0
    ? scoreEntries.reduce((sum, [, value]) => sum + Number(value || 0), 0) / scoreEntries.length
    : 0;
  const elapsedMinutes = simulation.completedAt
    ? Math.max(0, Math.round((simulation.completedAt.getTime() - simulation.startedAt.getTime()) / 60000))
    : null;
  const checklistResults = Array.isArray(simulation.evaluation.checklistResults)
    ? simulation.evaluation.checklistResults as ChecklistResult[]
    : [];

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">Auswertung</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{simulation.template.titleDe}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Durchschnitt: {average.toFixed(1)} / 10
              {elapsedMinutes !== null ? ` · Zeit: ${elapsedMinutes} Minuten` : ''}
            </p>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Dashboard
          </Link>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Scores</h2>
            <div className="mt-4 space-y-3">
              {scoreEntries.length === 0 ? (
                <p className="text-sm text-slate-600">Keine Scores vorhanden.</p>
              ) : scoreEntries.map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-ink">{key}</span>
                    <span className="text-slate-600">{Number(value).toFixed(1)} / 10</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-medical" style={{ width: `${Math.max(0, Math.min(100, Number(value) * 10))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Feedback Deutsch</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {simulation.evaluation.feedbackDe}
            </p>
            {simulation.evaluation.feedbackTr ? (
              <div className="mt-5 rounded-md bg-mint p-4">
                <h3 className="text-sm font-semibold text-ink">Turkce kocluk</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {simulation.evaluation.feedbackTr}
                </p>
              </div>
            ) : null}
          </article>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Pruefpunkte</h2>
          {checklistResults.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Keine Checklisten-Auswertung vorhanden.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {checklistResults.map((result, index) => (
                <li key={`${result.id ?? index}`} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">Punkt {result.id ?? index + 1}</p>
                    <p className="text-xs font-semibold text-medical">{Number(result.score ?? 0)} / 10</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{result.commentDe ?? 'Kein Kommentar.'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
