import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-medical">Synthema</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">FSP-Assistent</h1>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Login
          </Link>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-sm font-semibold text-medical">Clean Rebuild</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-ink md:text-5xl">
              Fachsprachenpruefung trainieren, ohne Abacus-Altlasten.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Diese Version ist ein sauberer Next.js-Neuaufbau. Zuerst pruefen wir Deployment,
              Environment Variables und Supabase-Anbindung. Danach kommen Simulation,
              Evaluation und Coaching Schritt fuer Schritt zurueck.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-md bg-medical px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
              >
                Zur Anmeldung
              </Link>
              <Link
                href="/api/health"
                className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-medical"
              >
                Health Check
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink">Phase 1</h3>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Next.js Root</dt>
                <dd className="font-semibold text-green-700">Repo-Root</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Middleware</dt>
                <dd className="font-semibold text-green-700">deaktiviert</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Supabase</dt>
                <dd className="font-semibold text-amber-700">Env pruefen</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Simulation</dt>
                <dd className="font-semibold text-slate-500">naechste Etappe</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}
