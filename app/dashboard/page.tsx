import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { DashboardLogout } from './logout-button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const [templates, recentSimulations] = await Promise.all([
    prisma.simulationTemplate.findMany({
      orderBy: { titleDe: 'asc' },
      take: 6
    }).catch(() => []),
    prisma.userSimulation.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 6,
      include: { template: true }
    }).catch(() => [])
  ]);

  const activeSimulations = recentSimulations.filter((simulation) => simulation.status === 'in_progress');
  const completedSimulations = recentSimulations.filter((simulation) => simulation.status !== 'in_progress');
  const resumeHref = activeSimulations[0]
    ? `/simulation/${activeSimulations[0].templateId}/chat?simId=${activeSimulations[0].id}`
    : '/simulation/new';

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">FSP-Assistent</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
            <p className="mt-2 inline-flex rounded bg-mint px-2 py-1 text-xs font-semibold text-ink">
              Dashboard v3 aktiv · Kacheln sind klickbar
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/api/health" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              Health
            </Link>
            <Link href="/" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              Start
            </Link>
            <DashboardLogout />
          </div>
        </header>

        <section className="grid gap-4 py-6 md:grid-cols-4">
          <Link href="/simulation/new" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-medical hover:shadow-md">
            <p className="text-sm text-slate-500">Vorlagen</p>
            <p className="mt-2 text-3xl font-bold text-medical">{templates.length}</p>
            <p className="mt-2 text-xs font-semibold text-ink">Neue Uebung erzeugen</p>
          </Link>
          <Link href={resumeHref} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-medical hover:shadow-md">
            <p className="text-sm text-slate-500">Aktive Simulationen</p>
            <p className="mt-2 text-3xl font-bold text-medical">{activeSimulations.length}</p>
            <p className="mt-2 text-xs font-semibold text-ink">{activeSimulations.length > 0 ? 'Fortsetzen' : 'Neue starten'}</p>
          </Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-medical hover:shadow-md">
            <p className="text-sm text-slate-500">Abgeschlossen</p>
            <p className="mt-2 text-3xl font-bold text-medical">{completedSimulations.length}</p>
            <p className="mt-2 text-xs font-semibold text-ink">Verlauf ansehen</p>
          </Link>
          <Link href={resumeHref} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-medical hover:shadow-md">
            <p className="text-sm text-slate-500">Naechster Schritt</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeSimulations.length > 0 ? 'Uebung fortsetzen' : 'Neue Uebung erzeugen'}
            </p>
            <p className="mt-2 text-xs font-semibold text-medical">Oeffnen</p>
          </Link>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/simulation/new"
            className="inline-flex rounded-md bg-medical px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
          >
            Neue Uebung starten
          </Link>
          {activeSimulations[0] ? (
            <Link
              href={`/simulation/${activeSimulations[0].templateId}/chat?simId=${activeSimulations[0].id}`}
              className="inline-flex rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Letzte Uebung fortsetzen
            </Link>
          ) : null}
        </div>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {[
            ['Anamnese', 'Arzt-Patient-Gespraech in Laiensprache'],
            ['Dokumentation', 'Kurznotiz und Aufnahmebericht'],
            ['Uebergabe', 'Strukturierte Fallvorstellung']
          ].map(([title, text]) => (
            <Link key={title} href="/simulation/new" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-medical hover:shadow-md">
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              <p className="mt-3 text-xs font-semibold text-medical">Uebung hierzu starten</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-ink">Vorhandene Uebungsvorlagen</h2>
              <Link href="/simulation/new" className="text-sm font-semibold text-medical">
                Neue erzeugen
              </Link>
            </div>
            {templates.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Noch keine Vorlagen gefunden. Starte oben mit der ersten Uebung.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {templates.map((template) => (
                  <li key={template.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                    <Link href={`/simulation/${template.id}/briefing`} className="block">
                      <p className="font-semibold text-ink">{template.titleDe}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{template.descriptionDe}</p>
                      <p className="mt-3 text-xs font-semibold text-medical">Briefing oeffnen</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Letzte Uebungen</h2>
            {recentSimulations.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Noch keine Simulationen fuer dieses Konto gefunden.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentSimulations.map((simulation) => {
                  const href = simulation.status === 'in_progress'
                    ? `/simulation/${simulation.templateId}/chat?simId=${simulation.id}`
                    : `/simulation/${simulation.templateId}/briefing`;

                  return (
                    <li key={simulation.id} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                      <Link href={href} className="block">
                        <p className="font-semibold text-ink">
                          {simulation.template?.titleDe ?? 'Uebung'}
                        </p>
                        <p className="mt-1 text-slate-600">
                          Status: {simulation.status} · Start: {simulation.startedAt.toLocaleDateString('de-DE')}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-medical">
                          {simulation.status === 'in_progress' ? 'Fortsetzen' : 'Briefing oeffnen'}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
