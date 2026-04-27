import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MODES = {
  explain: 'Erkläre die letzte KI-Antwort didaktisch auf Deutsch. Nutze bei schwierigen Begriffen eine kurze türkische Erklärung.',
  translate: 'Übersetze die letzte KI-Antwort ins Türkische und nenne danach 3 wichtige deutsche Ausdrücke mit türkischer Bedeutung.',
  follow_up: 'Beantworte die Nachfrage des Users zur letzten KI-Antwort. Bleibe lernorientiert und knapp.'
};

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
    const simId = String(body?.simId ?? '');
    const interactionId = String(body?.interactionId ?? '');
    const mode = String(body?.mode ?? '') as keyof typeof MODES;
    const question = String(body?.question ?? '').trim();

    if (!simId || !interactionId || !MODES[mode]) {
      return NextResponse.json({ error: 'simId, interactionId and mode are required' }, { status: 400 });
    }

    if (mode === 'follow_up' && !question) {
      return NextResponse.json({ error: 'Bitte geben Sie eine Nachfrage ein.' }, { status: 400 });
    }

    const simulation = await prisma.userSimulation.findFirst({
      where: { id: simId, userId: user.id },
      include: {
        template: true,
        interactions: { orderBy: { turnNumber: 'asc' } }
      }
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    const interaction = simulation.interactions.find((item) => item.id === interactionId);

    if (!interaction) {
      return NextResponse.json({ error: 'Antwort nicht gefunden.' }, { status: 404 });
    }

    const transcript = simulation.interactions
      .map((item) => `Kandidat: ${item.userInput}\nKI-Rolle: ${item.aiResponse}`)
      .join('\n\n');

    const prompt = `Du bist ein zweisprachiger FSP-Lerncoach für Ärztinnen und Ärzte aus der Türkei.

WICHTIG:
- Du bist hier nicht die Prüfungsrolle, sondern erklärst eine bereits gegebene KI-Antwort.
- Verändere die laufende Simulation nicht.
- Gib eine kurze, klare Lernhilfe.
- Wenn du Türkisch nutzt, dann als Hilfe zum Verstehen, nicht als Ersatz für die deutsche Prüfungsantwort.

ÜBUNG:
${simulation.template.titleDe}

BISHERIGER VERLAUF:
${transcript}

ANTWORT, ZU DER HILFE ANGEFORDERT WURDE:
${interaction.aiResponse}

AUFGABE:
${MODES[mode]}

NACHFRAGE DES USERS:
${question || 'Keine zusätzliche Nachfrage.'}

Antworte mit gut lesbarem Markdown.`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900,
        temperature: 0.3
      })
    });

    if (!llmResponse.ok) {
      const message = await llmResponse.text().catch(() => '');
      console.error('Simulation assist error:', llmResponse.status, message);
      return NextResponse.json({ error: 'LLM-API-Fehler bei der Lernhilfe.' }, { status: 502 });
    }

    const data = await llmResponse.json();
    const answer = String(data?.choices?.[0]?.message?.content ?? '').trim();

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Simulation assist route error:', error);
    return NextResponse.json({ error: 'Lernhilfe konnte nicht erstellt werden.' }, { status: 500 });
  }
}
