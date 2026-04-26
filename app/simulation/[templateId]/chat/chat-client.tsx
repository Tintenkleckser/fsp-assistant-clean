'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Interaction = {
  id: string;
  turnNumber: number;
  userInput: string;
  aiResponse: string;
};

export function ChatClient({
  simId,
  templateId,
  title,
  titleTr,
  description,
  descriptionTr,
  maxTurns,
  languageMode,
  startedAt,
  initialInteractions
}: {
  simId: string;
  templateId: string;
  title: string;
  titleTr: string;
  description: string;
  descriptionTr: string;
  maxTurns: number;
  languageMode: string;
  startedAt: string;
  initialInteractions: Interaction[];
}) {
  const router = useRouter();
  const [interactions, setInteractions] = useState(initialInteractions);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();

    if (!text) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/simulation/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simId, userMessage: text })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Nachricht konnte nicht gesendet werden.');
        setMessage(text);
        return;
      }

      setInteractions((current) => [...current, data.interaction]);
    } catch {
      setError('Netzwerkfehler beim Senden.');
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function finishAndEvaluate() {
    setEvaluating(true);
    setError('');

    try {
      const response = await fetch('/api/simulation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simId })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Auswertung konnte nicht erstellt werden.');
        return;
      }

      router.push(`/evaluation/${simId}`);
    } catch {
      setError('Netzwerkfehler bei der Auswertung.');
    } finally {
      setEvaluating(false);
    }
  }

  const remainingTurns = Math.max(maxTurns - interactions.length, 0);
  const timeLimitSeconds = 20 * 60;
  const remainingSeconds = Math.max(timeLimitSeconds - elapsedSeconds, 0);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeCritical = remainingSeconds <= 180;

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">Simulation</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{titleTr}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded bg-mint px-2 py-1 text-ink">
                {languageMode === 'bilingual' ? 'Deutsch + Tuerkisch' : 'Pruefungsmodus'}
              </span>
              <span className={`rounded px-2 py-1 ${timeCritical ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-ink'}`}>
                Zeit: {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              <span className="rounded bg-slate-100 px-2 py-1 text-ink">
                {remainingTurns} Antworten empfohlen
              </span>
            </div>
          </div>
          <Link href={`/simulation/${templateId}/briefing`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Briefing
          </Link>
        </header>

        <section className="py-6">
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-medical">Aufgabe auf Deutsch</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <div className="rounded-md bg-mint p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink">Orientierung auf Tuerkisch</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {descriptionTr || 'Nutzen Sie Deutsch fuer die eigentliche Pruefungsantwort. Die tuerkische Hilfe dient der Orientierung.'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {interactions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                Beginnen Sie das Gespraech. Zum Beispiel: Guten Tag, mein Name ist ...
              </div>
            ) : null}

            {interactions.map((interaction) => (
              <div key={interaction.id} className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-lg bg-medical px-4 py-3 text-sm leading-6 text-white">
                  {interaction.userInput}
                </div>
                <div className="max-w-[85%] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                  <p className="whitespace-pre-wrap">{interaction.aiResponse}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {error ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <label className="block">
              <span className="text-sm font-semibold text-ink">Ihre Antwort</span>
              <textarea
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Schreiben Sie Ihre Antwort auf Deutsch..."
                disabled={loading}
              />
            </label>
            <div className="mt-3 flex flex-wrap justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={finishAndEvaluate}
                  disabled={evaluating || loading || interactions.length === 0}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {evaluating ? 'Wird ausgewertet...' : 'Simulation beenden'}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Antwort wird erzeugt...' : 'Senden'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
