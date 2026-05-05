'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DIFFICULTY_LEVELS,
  PRACTICE_MODES,
  SIMULATION_TYPES,
  type DifficultyId,
  type PracticeModeId
} from '@/lib/topic-categories';

type TemplatePreview = {
  id: string;
  titleDe: string;
  descriptionDe: string;
  type: string;
  difficulty: string;
};

type RegionExamPart = {
  partKey: string;
  title: string;
  durationMinutes: number | null;
  sequenceOrder: number;
  languageFocus: string[];
  requiredOutput: string | null;
  isCorePart: boolean;
  trainingImpact: string | null;
};

type RegionRequirement = {
  partKey: string | null;
  requirementType: string;
  title: string;
  trainingImpact: string;
  severity: string;
};

type RegionContext = {
  id: string;
  name: string;
  summary: string | null;
  verificationStatus: string;
  examParts: RegionExamPart[];
  requirements: RegionRequirement[];
};

const fallbackParts: RegionExamPart[] = SIMULATION_TYPES.map((item, index) => ({
  partKey: item.id,
  title: item.label,
  durationMinutes: item.timeLimitMin,
  sequenceOrder: index + 1,
  languageFocus: [],
  requiredOutput: item.description,
  isCorePart: true,
  trainingImpact: item.description
}));

export function NewSimulationForm({
  recentTemplates,
  region
}: {
  recentTemplates: TemplatePreview[];
  region: RegionContext | null;
}) {
  const router = useRouter();
  const [practiceMode, setPracticeMode] = useState<PracticeModeId>(PRACTICE_MODES[0].id);
  const regionalCoreParts = region?.examParts.filter((part) => part.isCorePart) ?? [];
  const availableParts = regionalCoreParts.length > 0 ? regionalCoreParts : fallbackParts;
  const [selectedPartKey, setSelectedPartKey] = useState(availableParts[0]?.partKey ?? 'patient_conversation');
  const [difficulty, setDifficulty] = useState<DifficultyId>(DIFFICULTY_LEVELS[1].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const criticalRequirements = region?.requirements.filter((item) => item.severity === 'critical') ?? [];

  async function generateSimulation() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/simulation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceMode,
          simulationType: selectedPartKey,
          difficulty,
          regionId: region?.id ?? null,
          partKey: selectedPartKey
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Szenario konnte nicht erzeugt werden.');
        return;
      }

      router.push(`/simulation/${data.firstTemplateId ?? data.id}/briefing`);
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
            <h1 className="mt-1 text-2xl font-bold text-ink">Neue Übung</h1>
          </div>
          <Link href="/dashboard" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
            Dashboard
          </Link>
        </header>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-medical">Ziel-Bundesland</p>
              <h2 className="mt-1 text-xl font-bold text-ink">{region?.name ?? 'Noch nicht gewählt'}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {region?.summary ?? 'Bitte wählen Sie zuerst im Profil ein Bundesland, damit Prüfungsteile, Zeitlimits und Besonderheiten regional gesteuert werden können.'}
              </p>
            </div>
            <Link href="/profile" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              Bundesland ändern
            </Link>
          </div>
          {criticalRequirements.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {criticalRequirements.map((requirement) => (
                <div key={`${requirement.requirementType}-${requirement.title}`} className="rounded-md border border-red-100 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">{requirement.requirementType}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{requirement.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">{requirement.trainingImpact}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-5 py-8 md:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">1. Übungsform</h2>
            <div className="mt-4 space-y-3">
              {PRACTICE_MODES.map((item) => (
                <label
                  key={item.id}
                  className={`block cursor-pointer rounded-md border p-4 ${
                    practiceMode === item.id ? 'border-medical bg-mint' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="practiceMode"
                    value={item.id}
                    checked={practiceMode === item.id}
                    onChange={() => setPracticeMode(item.id)}
                  />
                  <span className="font-semibold text-ink">{item.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.description}</span>
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
          </div>

          {practiceMode === 'single_part' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">3. Prüfungsteil</h2>
            <div className="mt-4 space-y-3">
              {availableParts.map((item) => (
                <label
                  key={item.partKey}
                  className={`block cursor-pointer rounded-md border p-4 ${
                    selectedPartKey === item.partKey ? 'border-medical bg-mint' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="simulationType"
                    value={item.partKey}
                    checked={selectedPartKey === item.partKey}
                    onChange={() => setSelectedPartKey(item.partKey)}
                  />
                  <span className="font-semibold text-ink">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    {item.requiredOutput ?? item.trainingImpact ?? 'Regionaler Prüfungsteil'}
                  </span>
                  <span className="mt-2 inline-block rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {item.durationMinutes ?? 20} Minuten
                  </span>
                </label>
              ))}
            </div>
          </div>
          ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">3. Fallkette</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {availableParts.map((item, index) => (
                <li key={item.partKey} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <span className="font-semibold text-ink">Teil {index + 1}: {item.title}</span>
                  <span className="mt-1 block">{item.trainingImpact ?? item.requiredOutput}</span>
                  <span className="mt-2 inline-block rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {item.durationMinutes ?? 20} Minuten
                  </span>
                </li>
              ))}
            </ol>
          </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
              {loading ? 'Szenario wird erzeugt...' : practiceMode === 'full_exam' ? 'Gesamtprüfung erzeugen' : 'Übung erzeugen'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Vorhandene Übungsvorlagen</h2>
          {recentTemplates.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Noch keine Vorlagen vorhanden. Erzeuge oben die erste Übung.
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
