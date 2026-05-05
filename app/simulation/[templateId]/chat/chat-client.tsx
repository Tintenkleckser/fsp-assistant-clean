'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

type Interaction = {
  id: string;
  turnNumber: number;
  userInput: string;
  aiResponse: string;
};

type AssistState = {
  answer: string;
  error: string;
  loading: boolean;
  question: string;
  askOpen: boolean;
};

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

function MarkdownAnswer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;

    elements.push(
      <ul key={`list-${elements.length}`} className="my-3 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      elements.push(
        <h3 key={`heading-${index}`} className="mt-3 font-semibold text-ink">
          {renderInlineMarkdown(heading[2])}
        </h3>
      );
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();
    elements.push(
      <p key={`paragraph-${index}`} className="mt-2">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="text-sm leading-7 text-slate-800">{elements}</div>;
}

export function ChatClient({
  simId,
  templateId,
  title,
  titleTr,
  description,
  descriptionTr,
  maxTurns,
  timeLimitMinutes,
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
  timeLimitMinutes: number;
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
  const [assist, setAssist] = useState<Record<string, AssistState>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();

    if (!text) return;
    if (isTimeExpired) {
      setError('Die Prüfungszeit ist abgelaufen. Bitte beenden Sie die Simulation und lassen Sie sie auswerten.');
      return;
    }

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

  function updateAssist(interactionId: string, update: Partial<AssistState>) {
    setAssist((current) => ({
      ...current,
      [interactionId]: {
        ...(current[interactionId] ?? {
          answer: '',
          error: '',
          loading: false,
          question: '',
          askOpen: false
        }),
        ...update
      }
    }));
  }

  async function requestAssist(interaction: Interaction, mode: 'explain' | 'translate' | 'follow_up') {
    const current = assist[interaction.id];
    const question = current?.question.trim() ?? '';

    if (mode === 'follow_up' && !question) {
      updateAssist(interaction.id, { askOpen: true, error: 'Bitte geben Sie eine Nachfrage ein.' });
      return;
    }

    updateAssist(interaction.id, { loading: true, error: '', answer: mode === 'follow_up' ? current?.answer ?? '' : '' });

    try {
      const response = await fetch('/api/simulation/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simId,
          interactionId: interaction.id,
          mode,
          question
        })
      });
      const data = await response.json();

      if (!response.ok) {
        updateAssist(interaction.id, { error: data?.error ?? 'Lernhilfe konnte nicht erstellt werden.' });
        return;
      }

      updateAssist(interaction.id, {
        answer: data.answer ?? '',
        question: mode === 'follow_up' ? question : current?.question ?? '',
        askOpen: mode === 'follow_up' ? false : current?.askOpen ?? false
      });
    } catch {
      updateAssist(interaction.id, { error: 'Netzwerkfehler bei der Lernhilfe.' });
    } finally {
      updateAssist(interaction.id, { loading: false });
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
  const timeLimitSeconds = Math.max(1, timeLimitMinutes) * 60;
  const remainingSeconds = Math.max(timeLimitSeconds - elapsedSeconds, 0);
  const overtimeSeconds = Math.max(elapsedSeconds - timeLimitSeconds, 0);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeCritical = remainingSeconds <= 180;
  const isTimeExpired = overtimeSeconds > 0;
  const overtimeMinutes = Math.floor(overtimeSeconds / 60);
  const overtimeRemainderSeconds = overtimeSeconds % 60;
  const modeLabel = languageMode === 'turkish_practice'
    ? 'Türkischer Lernmodus'
    : languageMode === 'bilingual'
      ? 'Deutsch + Türkisch'
      : 'Prüfungsmodus';
  const answerLabel = languageMode === 'turkish_practice' ? 'Ihre Antwort auf Türkisch' : 'Ihre Antwort';
  const answerPlaceholder = languageMode === 'turkish_practice'
    ? 'Türkçe cevap yazın. Uygulama bunu Almanca sınav cümlelerine dönüştürür...'
    : 'Schreiben Sie Ihre Antwort auf Deutsch...';

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
                {modeLabel}
              </span>
              <span className={`rounded px-2 py-1 ${timeCritical ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-ink'}`}>
                {isTimeExpired
                  ? `Zeit ueberschritten: +${overtimeMinutes}:${overtimeRemainderSeconds.toString().padStart(2, '0')}`
                  : `Zeit: ${minutes}:${seconds.toString().padStart(2, '0')}`}
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
              {languageMode === 'turkish_practice' ? (
                <p className="mt-3 rounded bg-white px-3 py-2 text-xs font-semibold leading-5 text-ink">
                  Türkischer Lernmodus: Sie dürfen auf Türkisch arbeiten. Bewertet wird zusätzlich, wie gut daraus eine knappe deutsche Prüfungsantwort entstehen kann.
                </p>
              ) : null}
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
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => updateAssist(interaction.id, { askOpen: !assist[interaction.id]?.askOpen, error: '' })}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      Nachfragen
                    </button>
                    <button
                      type="button"
                      onClick={() => requestAssist(interaction, 'explain')}
                      disabled={assist[interaction.id]?.loading}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Erklären
                    </button>
                    <button
                      type="button"
                      onClick={() => requestAssist(interaction, 'translate')}
                      disabled={assist[interaction.id]?.loading}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Türkisch
                    </button>
                  </div>
                  {assist[interaction.id]?.askOpen ? (
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-700">Nachfrage zur KI-Antwort</span>
                        <textarea
                          className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
                          value={assist[interaction.id]?.question ?? ''}
                          onChange={(event) => updateAssist(interaction.id, { question: event.target.value })}
                          placeholder="Was bedeutet dieser Satz? Kannst du mir das einfacher erklären?"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => requestAssist(interaction, 'follow_up')}
                        disabled={assist[interaction.id]?.loading}
                        className="mt-2 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Nachfrage senden
                      </button>
                    </div>
                  ) : null}
                  {assist[interaction.id]?.error ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {assist[interaction.id]?.error}
                    </div>
                  ) : null}
                  {assist[interaction.id]?.loading ? (
                    <div className="mt-3 rounded-md bg-mint px-3 py-2 text-xs font-semibold text-ink">
                      Lernhilfe wird erstellt...
                    </div>
                  ) : null}
                  {assist[interaction.id]?.answer ? (
                    <div className="mt-3 rounded-md bg-mint p-3">
                      <MarkdownAnswer content={assist[interaction.id]?.answer ?? ''} />
                    </div>
                  ) : null}
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
            {isTimeExpired ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                Zeitlimit erreicht. Weitere Antworten werden nicht mehr gewertet.
              </div>
            ) : null}
            <label className="block">
              <span className="text-sm font-semibold text-ink">{answerLabel}</span>
              <textarea
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={answerPlaceholder}
                disabled={loading || isTimeExpired}
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
                disabled={loading || isTimeExpired || !message.trim()}
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
