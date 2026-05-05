'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

function MarkdownFeedback({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
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
        <h3 key={`heading-${index}`} className="mt-4 font-semibold text-ink">
          {renderInlineMarkdown(heading[2])}
        </h3>
      );
      return;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushList();
      elements.push(
        <p key={`numbered-${index}`} className="mt-3 font-semibold text-ink">
          {renderInlineMarkdown(numbered[1])}
        </p>
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

type CoachMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type RegionOption = {
  id: string;
  name: string;
  summary: string | null;
  verificationStatus: string;
};

export function ProfileClient({
  email,
  initialName,
  initialAvatarUrl,
  initialTargetRegionId,
  regions
}: {
  email: string;
  initialName: string;
  initialAvatarUrl: string;
  initialTargetRegionId: string;
  regions: RegionOption[];
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [targetRegionId, setTargetRegionId] = useState(initialTargetRegionId);
  const [password, setPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachError, setCoachError] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password.trim() ? password : undefined,
        data: {
          full_name: name.trim(),
          avatar_url: avatarUrl.trim()
        }
      });

      if (error) {
        setProfileError(error.message);
        return;
      }

      const preferencesResponse = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRegionId: targetRegionId || null })
      });

      if (!preferencesResponse.ok) {
        const data = await preferencesResponse.json().catch(() => null);
        setProfileError(data?.error ?? 'Prüfungsregion konnte nicht gespeichert werden.');
        return;
      }

      setPassword('');
      setProfileMessage('Profil wurde gespeichert.');
    } catch {
      setProfileError('Profil konnte nicht gespeichert werden.');
    } finally {
      setProfileLoading(false);
    }
  }

  async function runCoachRequest(nextQuestion: string, mode: 'question' | 'explain' | 'translate') {
    const text = nextQuestion.trim() || 'Bitte gib mir eine Empfehlung, was ich als Nächstes üben soll.';
    const userMessage: CoachMessage = { role: 'user', content: text };
    const requestHistory = [...coachMessages, userMessage];

    setCoachError('');
    setCoachLoading(true);
    setCoachMessages(requestHistory);

    try {
      const response = await fetch('/api/profile/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          mode,
          history: coachMessages
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setCoachError(data?.error ?? 'KI-Coach konnte nicht antworten.');
        return;
      }

      if (!response.body) {
        setCoachError('KI-Coach konnte keine Streaming-Antwort senden.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setCoachMessages([...requestHistory, { role: 'assistant', content: assistantText }]);
      }
    } catch {
      setCoachError('Netzwerkfehler beim KI-Coach.');
    } finally {
      setCoachLoading(false);
    }
  }

  async function askCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runCoachRequest(question, 'question');
    setQuestion('');
  }

  const lastCoachAnswer = [...coachMessages].reverse().find((item) => item.role === 'assistant')?.content ?? '';

  return (
    <section className="grid gap-5 py-8 md:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={saveProfile} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Kontodaten</h2>
        <p className="mt-1 text-sm text-slate-600">{email}</p>

        {avatarUrl ? (
          <div className="mt-5 flex items-center gap-3">
            <img
              src={avatarUrl}
              alt="Profilbild"
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
            <p className="text-sm text-slate-600">Profilbild</p>
          </div>
        ) : null}

        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Bild-URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Neues Passwort</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Leer lassen, wenn es unverändert bleiben soll"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-slate-700">Ziel-Bundesland für die FSP</legend>
          {regions.length === 0 ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Noch keine Bundesländer in Supabase gefunden.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {regions.map((region) => (
                <label
                  key={region.id}
                  className={`block cursor-pointer rounded-md border p-3 ${
                    targetRegionId === region.id ? 'border-medical bg-mint' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="targetRegionId"
                    value={region.id}
                    checked={targetRegionId === region.id}
                    onChange={() => setTargetRegionId(region.id)}
                  />
                  <span className="block text-sm font-semibold text-ink">{region.name}</span>
                  {region.summary ? (
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{region.summary}</span>
                  ) : null}
                  <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {region.verificationStatus}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {profileError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {profileError}
          </div>
        ) : null}
        {profileMessage ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {profileMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={profileLoading}
          className="mt-5 w-full rounded-md bg-ink px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {profileLoading ? 'Wird gespeichert...' : 'Profil speichern'}
        </button>
      </form>

      <form onSubmit={askCoach} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">KI-Lerncoach</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Stelle eine Frage oder lass dir aus deinen bisherigen Übungen eine Empfehlung geben.
        </p>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">Frage an den Coach</span>
          <textarea
            className="mt-1 min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Was soll ich als Nächstes üben?"
          />
        </label>

        {coachError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {coachError}
          </div>
        ) : null}

        {coachMessages.length > 0 ? (
          <div className="mt-4 space-y-3">
            {coachMessages.map((item, index) => (
              <div
                key={index}
                className={item.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-md bg-medical px-4 py-3 text-sm leading-6 text-white'
                  : 'rounded-md bg-mint p-4'}
              >
                {item.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{item.content}</p>
                ) : (
                  <MarkdownFeedback content={item.content} />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {lastCoachAnswer ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runCoachRequest('Bitte erkläre deine letzte Antwort einfacher und mit Beispielen.', 'explain')}
              disabled={coachLoading}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Letzte Antwort erklären
            </button>
            <button
              type="button"
              onClick={() => runCoachRequest('Bitte übersetze deine letzte Antwort ins Türkische und markiere wichtige deutsche Fachbegriffe.', 'translate')}
              disabled={coachLoading}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Türkisch übersetzen
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={coachLoading}
          className="mt-5 w-full rounded-md bg-medical px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {coachLoading ? 'Coach denkt nach...' : 'Feedback anfordern'}
        </button>
      </form>
    </section>
  );
}
