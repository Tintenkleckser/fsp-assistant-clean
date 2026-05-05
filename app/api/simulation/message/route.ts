import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function languageModeInstructions(languageMode: string) {
  if (languageMode === 'turkish_practice') {
    return `Antwortformat fuer tuerkischen Lernmodus:
1. TR Anlama: Reagiere kurz auf Tuerkisch auf den Inhalt der User-Antwort und klaere, ob die medizinische/kommunikative Absicht richtig ist.
2. DE Pruefungssatz: Formuliere danach eine knappe, pruefungstaugliche deutsche Antwort, die der Kandidat in der FSP sagen oder schreiben koennte.
3. Zeitstrategie: Gib einen sehr kurzen Hinweis, wie dieselbe Antwort schneller und priorisierter innerhalb des Zeitlimits gesagt werden kann.
Wichtig: In diesem Modus darf der Kandidat auf Tuerkisch arbeiten. Behandle Tuerkisch nicht als Fehler, sondern als Lernbruecke. Fuehre aber konsequent zur deutschen Zielformulierung zurueck.`;
  }

  if (languageMode === 'bilingual') {
    return `Antwortformat:
1. Rolle: Antworte zuerst auf Deutsch in der Pruefungsrolle.
2. TR Koçluk: Gib danach auf Tuerkisch maximal zwei kurze Hinweise: eine bessere deutsche Formulierung oder ein relevantes Wort, und einen Zeit-/Strukturhinweis.
Die tuerkische Hilfe darf nicht die ganze Loesung ersetzen.`;
  }

  return 'Antworte ausschliesslich auf Deutsch in der Pruefungsrolle.';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const simId = String(body?.simId ?? '');
    const userMessage = String(body?.userMessage ?? '').trim();

    if (!simId || !userMessage) {
      return NextResponse.json({ error: 'simId and userMessage are required' }, { status: 400 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'MISTRAL_API_KEY fehlt in Vercel.' }, { status: 500 });
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

    const previousMessages = simulation.interactions.flatMap((interaction) => [
      { role: 'user' as const, content: interaction.userInput },
      { role: 'assistant' as const, content: interaction.aiResponse }
    ]);

    const systemPrompt = `${simulation.template.systemPrompt}

Du bist Teil einer FSP-Uebung. Antworte in deiner Rolle, knapp und realistisch.
Bleibe im Szenario. Bewerte den Kandidaten noch nicht, sondern fuehre die Simulation fort.
Wenn der Kandidat medizinische Fachsprache gegenueber einem Patienten verwendet, reagiere als Patient verstaendnislos.
Die Zielgruppe sind Aerztinnen und Aerzte aus der Tuerkei, die Deutsch fuer die Fachsprachenpruefung lernen.
Alle Aufgaben sind zeitkritisch. Halte deine Antworten knapp, damit der Kandidat unter Pruefungsbedingungen trainiert.
${languageModeInstructions(simulation.languageMode)}
`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          ...previousMessages,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 700,
        temperature: 0.7
      })
    });

    if (!llmResponse.ok) {
      const message = await llmResponse.text().catch(() => '');
      console.error('Mistral message error:', llmResponse.status, message);
      return NextResponse.json({ error: 'LLM-API-Fehler im Chat.' }, { status: 502 });
    }

    const data = await llmResponse.json();
    const aiResponse = String(data?.choices?.[0]?.message?.content ?? '').trim();
    const turnNumber = simulation.interactions.length + 1;

    const interaction = await prisma.simulationInteraction.create({
      data: {
        simulationId: simulation.id,
        turnNumber,
        userInput: userMessage,
        aiResponse
      }
    });

    return NextResponse.json({ interaction });
  } catch (error) {
    console.error('Simulation message error:', error);
    return NextResponse.json({ error: 'Chat-Nachricht konnte nicht verarbeitet werden.' }, { status: 500 });
  }
}
