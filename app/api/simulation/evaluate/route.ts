import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function extractJson(content: string) {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const simId = String(body?.simId ?? '');

    if (!simId) {
      return NextResponse.json({ error: 'simId required' }, { status: 400 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'MISTRAL_API_KEY fehlt in Vercel.' }, { status: 500 });
    }

    const simulation = await prisma.userSimulation.findFirst({
      where: { id: simId, userId: user.id },
      include: {
        template: true,
        interactions: { orderBy: { turnNumber: 'asc' } },
        evaluation: true
      }
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    if (simulation.evaluation) {
      return NextResponse.json({ evaluation: simulation.evaluation, cached: true });
    }

    const checklist = Array.isArray(simulation.template.checklist)
      ? simulation.template.checklist
      : [];
    const transcript = simulation.interactions
      .map((interaction) => `Kandidat: ${interaction.userInput}\nGegenrolle: ${interaction.aiResponse}`)
      .join('\n\n');

    const prompt = `Du bist ein erfahrener FSP-Pruefer.

Bewerte diese Fachsprachenpruefung-Uebung. Es geht um SPRACHKOMPETENZ, Kommunikation und Struktur, nicht um perfektes medizinisches Fachwissen.

AUFGABE:
${simulation.template.titleDe}
${simulation.template.descriptionDe}

CHECKLISTE:
${JSON.stringify(checklist, null, 2)}

GESPEICHERTER GESPRACHSVERLAUF:
${transcript || 'Keine Interaktionen vorhanden.'}

Antworte ausschliesslich als valides JSON:
{
  "feedbackDe": "Ausfuehrliches Feedback auf Deutsch mit Staerken, Verbesserungen und 3 konkreten Beispielsatz-Alternativen.",
  "feedbackTr": "Kurze tuerkische Zusammenfassung des Feedbacks.",
  "scores": {
    "struktur": 0-10,
    "verstaendlichkeit": 0-10,
    "fachsprache": 0-10,
    "empathie": 0-10
  },
  "checklistResults": [
    {"id":"1","fulfilled":true,"score":0-10,"commentDe":"Kurzer Kommentar","commentTr":"Kisa yorum"}
  ]
}

Nutze alle Checklisten-Items. Sei fair, konkret und lernorientiert.`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2600,
        temperature: 0.35,
        response_format: { type: 'json_object' }
      })
    });

    if (!llmResponse.ok) {
      const message = await llmResponse.text().catch(() => '');
      console.error('Mistral evaluate error:', llmResponse.status, message);
      return NextResponse.json({ error: 'LLM-API-Fehler bei der Auswertung.' }, { status: 502 });
    }

    const data = await llmResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = extractJson(content);

    const evaluation = await prisma.evaluation.create({
      data: {
        simulationId: simulation.id,
        feedbackDe: String(parsed.feedbackDe ?? 'Kein Feedback verfuegbar.'),
        feedbackTr: String(parsed.feedbackTr ?? ''),
        scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : {},
        checklistResults: Array.isArray(parsed.checklistResults) ? parsed.checklistResults : [],
        docFeedbackDe: null,
        docFeedbackTr: null,
        docScore: null
      }
    });

    await prisma.userSimulation.update({
      where: { id: simulation.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    return NextResponse.json({ evaluation, cached: false });
  } catch (error) {
    console.error('Evaluate simulation error:', error);
    return NextResponse.json({ error: 'Simulation konnte nicht ausgewertet werden.' }, { status: 500 });
  }
}
