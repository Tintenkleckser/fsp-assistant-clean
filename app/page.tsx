import Link from 'next/link';

const examParts = [
  ['Teil 1', 'Arzt-Patienten-Gespräch', 'Anamnese, Empathie und laienverständliche Sprache.'],
  ['Teil 2', 'Dokumentation', 'Strukturierte Notizen, Aufnahmebericht und präzise Formulierungen.'],
  ['Teil 3', 'Arzt-Arzt-Gespräch', 'Fallvorstellung, Fachsprache und klinische Struktur.']
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">Deutsch für Ärztinnen und Ärzte</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">FSP-Assistent</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-medical"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Registrieren
            </Link>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className="text-sm font-semibold text-medical">Vorbereitung auf die Fachsprachenprüfung</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-ink md:text-5xl">
              Die FSP als echte Prüfung üben: einzeln oder vollständig.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Für Ärztinnen und Ärzte aus der Türkei: deutsch üben, türkische Orientierung nutzen
              und die drei Prüfungsteile unter Zeitdruck trainieren. Einzelne Teile helfen beim
              gezielten Lernen, die Gesamtprüfung hält den medizinischen Fall zusammen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-md bg-medical px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
              >
                Zur Übung
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-medical"
              >
                Konto erstellen
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink">Trainingsmodus</h3>
            <div className="mt-5 space-y-3">
              {examParts.map(([part, title, text]) => (
                <div key={part} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-medical">{part}</p>
                  <p className="mt-1 font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md bg-mint p-3">
                <p className="font-semibold text-ink">Zweisprachig</p>
                <p className="mt-1 leading-6 text-slate-700">Deutsch trainieren, türkische Hinweise verstehen.</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="font-semibold text-ink">20 Minuten</p>
                <p className="mt-1 leading-6 text-slate-700">Zeitgefühl wie in der Prüfung aufbauen.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
