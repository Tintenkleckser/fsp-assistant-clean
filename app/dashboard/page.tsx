import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const [templateCount, recentSimulations] = await Promise.all([
    prisma.simulationTemplate.count().catch(() => 0),
    prisma.userSimulation.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 3,
      include: { template: true }
    }).catch(() => [])
  ]);

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">FSP-Assistent</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          </div>
          <Link href="/" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Start
          </Link>
        </header>

        <div className="mt-6">
          <Link
            href="/simulation/new"
            className="inline-flex rounded-md bg-medical px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
          >
            Neue Uebung starten
          </Link>
        </div>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {[
            ['Anamnese', 'Arzt-Patient-Gespraech in Laiensprache'],
            ['Dokumentation', 'Kurznotiz und Aufnahmebericht'],
            ['Uebergabe', 'Strukturierte Fallvorstellung']
          ].map(([title, text]) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Datenbankstatus</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Gefundene Uebungsvorlagen in der Datenbank.
            </p>
            <p className="mt-4 text-4xl font-bold text-medical">{templateCount}</p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">Letzte Uebungen</h2>
            {recentSimulations.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Noch keine Simulationen fuer dieses Konto gefunden.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentSimulations.map((simulation) => (
                  <li key={simulation.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-ink">
                      {simulation.template?.titleDe ?? 'Uebung'}
                    </p>
                    <p className="text-slate-600">{simulation.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
