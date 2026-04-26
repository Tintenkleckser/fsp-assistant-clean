'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DIFFICULTY_LEVELS, SIMULATION_TYPES } from '@/lib/topic-categories';

type TemplatePreview = {
  id: string;
  titleDe: string;
  descriptionDe: string;
  type: string;
  difficulty: string;
};

export function NewSimulationForm({ recentTemplates }: { recentTemplates: TemplatePreview[] }) {
  const router = useRouter();
  const [simulationType, setSimulationType] = useState(SIMULATION_TYPES[0].id);
  const [difficulty, setDifficulty] = useState(DIFFICULTY_LEVELS[1].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generateSimulation() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/simulation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationType, difficulty })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Szenario konnte nicht erzeugt werden.');
        return;
      }

      router.push(`/simulation/${data.id}/briefing`);
    } catch {
      setError('Netzwerkfehler bei der Szenario-Erzeugung.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-medical">FSP-Assistent</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Neue Uebung</h1>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Dashboard
          </Link>
        </header>

        <section className="grid gap-5 py-8 md:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">1. Pruefungsteil</h2>
            <div className="mt-4 space-y-3">
              {SIMULATION_TYPES.map((item) => (
                <label
                  key={item.id}
                  className={`block cursor-pointer rounded-md border p-4 ${
                    simulationType === item.id ? 'border-medical bg-mint' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="simulationType"
                    value={item.id}
                    checked={simulationType === item.id}
                    onChange={() => setSimulationType(item.id)}
                  />
                  <span className="font-semibold text-ink">{item.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.description}</span>
                  <span className="mt-2 inline-block rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {item.timeLimitMin} Minuten
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">2. Schwierigkeit</h2>
            <div className="mt-4 space-y-3">
              {DIFFICULTY_LEVELS.map((item) => (
                <label
                  key={item.id}
                  className={`block cursor-pointer rounded-md border p-4 ${
                    difficulty === item.id ? 'border-medical bg-mint' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="difficulty"
                    value={item.id}
                    checked={difficulty === item.id}
                    onChange={() => setDifficulty(item.id)}
                  />
                  <span className="font-semibold text-ink">{item.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.description}</span>
                </label>
              ))}
            </div>

            {error ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              onClick={generateSimulation}
              disabled={loading}
              className="mt-5 w-full rounded-md bg-medical px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
            >
              {loading ? 'Szenario wird erzeugt...' : 'Uebung erzeugen'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Vorhandene Uebungsvorlagen</h2>
          {recentTemplates.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Noch keine Vorlagen vorhanden. Erzeuge oben die erste Uebung.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recentTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/simulation/${template.id}/briefing`}
                  className="rounded-md border border-slate-200 p-4 transition hover:border-medical"
                >
                  <p className="font-semibold text-ink">{template.titleDe}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{template.descriptionDe}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
