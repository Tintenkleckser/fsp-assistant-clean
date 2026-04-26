import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { SIMULATION_TYPES } from '@/lib/topic-categories';

export const dynamic = 'force-dynamic';

export default async function BriefingPage({ params }: { params: { templateId: string } }) {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const template = await prisma.simulationTemplate.findUnique({
    where: { id: params.templateId }
  });

  if (!template) {
    notFound();
  }

  const simulationType = SIMULATION_TYPES.find((item) => item.id === template.type);
  const checklist = Array.isArray(template.checklist) ? template.checklist : [];

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">{simulationType?.label ?? 'FSP-Uebung'}</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{template.titleDe}</h1>
          </div>
          <Link href="/simulation/new" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Auswahl
          </Link>
        </header>

        <section className="py-8">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Briefing</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {template.descriptionDe}
            </p>
            <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-slate-500">Schwierigkeit</dt>
                <dd className="mt-1 font-semibold text-ink">{template.difficulty}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-slate-500">Max. Turns</dt>
                <dd className="mt-1 font-semibold text-ink">{template.maxTurns}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-slate-500">Checkliste</dt>
                <dd className="mt-1 font-semibold text-ink">{checklist.length} Punkte</dd>
              </div>
            </dl>
          </article>

          <article className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Pruefpunkte</h2>
            {checklist.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Keine Checkliste vorhanden.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {checklist.map((item, index) => {
                  const entry = item as { textDe?: string; category?: string; weight?: number };
                  return (
                    <li key={`${entry.textDe}-${index}`} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-ink">{entry.textDe ?? `Punkt ${index + 1}`}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.category ?? 'Kommunikation'} · Gewichtung {entry.weight ?? 1}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold"
            >
              Zurueck zum Dashboard
            </Link>
            <button
              type="button"
              className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white opacity-70"
              disabled
            >
              Chat folgt im naechsten Schritt
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
