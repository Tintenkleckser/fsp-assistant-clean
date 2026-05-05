'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StartSimulationButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMode, setSelectedMode] = useState<'german_only' | 'bilingual' | 'turkish_practice'>('bilingual');

  async function startSimulation() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, languageMode: selectedMode })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Simulation konnte nicht gestartet werden.');
        return;
      }

      router.push(`/simulation/${templateId}/chat?simId=${data.id}`);
    } catch {
      setError('Netzwerkfehler beim Starten.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-ink">Trainingsmodus</p>
      <div className="mt-3 grid gap-2">
        {[
          {
            id: 'bilingual',
            title: 'Deutsch mit türkischer Hilfe',
            text: 'Prüfungsrolle auf Deutsch, danach kurze türkische Lernhinweise.'
          },
          {
            id: 'german_only',
            title: 'Prüfungsmodus Deutsch',
            text: 'Nur Deutsch, ohne muttersprachliche Hilfe.'
          },
          {
            id: 'turkish_practice',
            title: 'Türkischer Lernmodus',
            text: 'Aufgabe darf auf Türkisch bearbeitet werden; die App baut daraus deutsche Prüfungsformulierungen.'
          }
        ].map((mode) => (
          <label
            key={mode.id}
            className={`cursor-pointer rounded-md border p-3 ${
              selectedMode === mode.id ? 'border-medical bg-mint' : 'border-slate-200 bg-white'
            }`}
          >
            <input
              className="sr-only"
              type="radio"
              name="languageMode"
              value={mode.id}
              checked={selectedMode === mode.id}
              onChange={() => setSelectedMode(mode.id as typeof selectedMode)}
            />
            <span className="block text-sm font-semibold text-ink">{mode.title}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{mode.text}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        onClick={startSimulation}
        disabled={loading}
      >
        {loading ? 'Simulation startet...' : 'Chat starten'}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
