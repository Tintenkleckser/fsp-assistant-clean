import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">FSP-Assistent</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Dashboard</h1>
          </div>
          <Link href="/" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Start
          </Link>
        </header>

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
      </div>
    </main>
  );
}
