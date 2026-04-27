import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'MISTRAL_API_KEY fehlt in Vercel.' }, { status: 500 });
    }

    const body = await request.json();
    const question = String(body?.question ?? '').trim();

    const simulations = await prisma.userSimulation.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 8,
      include: {
        template: true,
        evaluation: true,
        _count: { select: { interactions: true } }
      }
    });

    const history = simulations.map((simulation) => ({
      title: simulation.template.titleDe,
      type: simulation.template.type,
      difficulty: simulation.template.difficulty,
      status: simulation.status,
      turns: simulation._count.interactions,
      scores: simulation.evaluation?.scores ?? null,
      feedbackDe: simulation.evaluation?.feedbackDe?.slice(0, 1000) ?? null,
      feedbackTr: simulation.evaluation?.feedbackTr?.slice(0, 800) ?? null
    }));

    const prompt = `Du bist ein persönlicher Lerncoach für Ärztinnen und Ärzte aus der Türkei, die sich auf die deutsche Fachsprachenprüfung vorbereiten.

AUFGABE:
Gib ein konkretes, freundliches und priorisiertes Lernfeedback.
Hilf gezielt zu entscheiden, welche Übung als Nächstes sinnvoll ist.
Berücksichtige die drei Prüfungsteile: Arzt-Patienten-Gespräch, Dokumentation, Arzt-Arzt-Gespräch.
Berücksichtige außerdem Zeitmanagement, Sprachpräzision, Verständlichkeit, Struktur und Fachsprache.

FRAGE DES USERS:
${question || 'Bitte gib mir eine Empfehlung, was ich als Nächstes üben soll.'}

BISHERIGE ÜBUNGEN UND AUSWERTUNGEN:
${JSON.stringify(history, null, 2)}

Antworte auf Deutsch. Nutze kurze Abschnitte:
1. Kurzdiagnose
2. Nächste beste Übung
3. Konkreter Trainingsplan für die nächsten 30 Minuten
4. Ein türkischer Merksatz, wenn er hilfreich ist`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1400,
        temperature: 0.35
      })
    });

    if (!llmResponse.ok) {
      const message = await llmResponse.text().catch(() => '');
      console.error('Profile coach error:', llmResponse.status, message);
      return NextResponse.json({ error: 'LLM-API-Fehler beim Lerncoach.' }, { status: 502 });
    }

    const data = await llmResponse.json();
    const feedback = String(data?.choices?.[0]?.message?.content ?? '').trim();

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Profile coach route error:', error);
    return NextResponse.json({ error: 'Lerncoach konnte nicht antworten.' }, { status: 500 });
  }
}
