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
        temperature: 0.35,
        stream: true
      })
    });

    if (!llmResponse.ok) {
      const message = await llmResponse.text().catch(() => '');
      console.error('Profile coach error:', llmResponse.status, message);
      return NextResponse.json({ error: 'LLM-API-Fehler beim Lerncoach.' }, { status: 502 });
    }

    if (!llmResponse.body) {
      return NextResponse.json({ error: 'Keine Streaming-Antwort vom Lerncoach.' }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();

              if (!trimmed.startsWith('data:')) continue;

              const payload = trimmed.slice(5).trim();

              if (!payload || payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                const content = parsed?.choices?.[0]?.delta?.content;

                if (typeof content === 'string' && content.length > 0) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Ignore malformed stream fragments and continue reading.
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform'
      }
    });
  } catch (error) {
    console.error('Profile coach route error:', error);
    return NextResponse.json({ error: 'Lerncoach konnte nicht antworten.' }, { status: 500 });
  }
}
