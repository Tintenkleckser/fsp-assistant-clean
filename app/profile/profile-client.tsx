'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileClient({
  email,
  initialName,
  initialAvatarUrl
}: {
  email: string;
  initialName: string;
  initialAvatarUrl: string;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [password, setPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [coachFeedback, setCoachFeedback] = useState('');
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

      setPassword('');
      setProfileMessage('Profil wurde gespeichert.');
    } catch {
      setProfileError('Profil konnte nicht gespeichert werden.');
    } finally {
      setProfileLoading(false);
    }
  }

  async function askCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCoachError('');
    setCoachFeedback('');
    setCoachLoading(true);

    try {
      const response = await fetch('/api/profile/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await response.json();

      if (!response.ok) {
        setCoachError(data?.error ?? 'KI-Coach konnte nicht antworten.');
        return;
      }

      setCoachFeedback(data.feedback ?? '');
    } catch {
      setCoachError('Netzwerkfehler beim KI-Coach.');
    } finally {
      setCoachLoading(false);
    }
  }

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

        {coachFeedback ? (
          <div className="mt-4 rounded-md bg-mint p-4 text-sm leading-7 text-slate-800 whitespace-pre-wrap">
            {coachFeedback}
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
