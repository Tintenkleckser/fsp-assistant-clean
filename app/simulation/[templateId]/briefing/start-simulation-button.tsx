'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StartSimulationButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startSimulation() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, languageMode: 'bilingual' })
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
    <div>
      <button
        type="button"
        className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        onClick={startSimulation}
        disabled={loading}
      >
        {loading ? 'Simulation startet...' : 'Chat starten'}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
