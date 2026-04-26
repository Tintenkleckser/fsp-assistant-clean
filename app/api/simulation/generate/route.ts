import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { getDifficulty, getSimulationType } from '@/lib/topic-categories';

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
    const difficulty = getDifficulty(String(body?.difficulty ?? ''));
    const simulationType = getSimulationType(String(body?.simulationType ?? ''));

    if (!difficulty || !simulationType) {
      return NextResponse.json({ error: 'Pruefungsteil und Schwierigkeit sind erforderlich.' }, { status: 400 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'MISTRAL_API_KEY fehlt in Vercel.' }, { status: 500 });
    }

    const maxTurns = difficulty.id === 'beginner' ? 8 : difficulty.id === 'intermediate' ? 10 : 12;
    const prompt = `Du bist ein Experte fuer die deutsche Fachsprachenpruefung fuer internationale Aerztinnen und Aerzte.

Erstelle ein realistisches FSP-Uebungsszenario.

Pruefungsteil: ${simulationType.label}
Beschreibung: ${simulationType.description}
Schwierigkeit: ${difficulty.label} - ${difficulty.description}

Wichtig:
- Es geht um Sprachkompetenz, nicht um medizinisches Fachwissen.
- Das Szenario soll in Notaufnahme oder stationaerer Aufnahme spielen.
- Erfinde konkrete Patientendaten: Name, Alter, Beruf, Hauptbeschwerde, relevante Vorgeschichte.
- Bei Teil 1 muss die Sprache laienverstaendlich sein.
- Bei Teil 3 ist Fachsprache gewuenscht.
- Die Checkliste bewertet Kommunikation, Struktur und sprachliche Angemessenheit.

Antworte ausschliesslich als valides JSON:
{
  "titleDe": "Kurzer deutscher Titel",
  "titleTr": "Kurzer tuerkischer Titel",
  "descriptionDe": "Konkrete Aufgabenstellung auf Deutsch, 3-5 Saetze",
  "descriptionTr": "Tuerkische Zusammenfassung",
  "systemPrompt": "Ausfuehrliche Rollenbeschreibung fuer den spaeteren Chat, mindestens 180 Woerter",
  "evaluationCriteria": ["Kriterium 1", "Kriterium 2"],
  "checklist": [
    {"id":"1","textDe":"Pruefpunkt","textTr":"Tuerkische Uebersetzung","category":"Kommunikation","weight":2}
  ]
}

Checkliste: 8 bis 12 Items. weight: 1 normal, 2 wichtig, 3 kritisch.`;

    const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      })
    });

    if (!llmResponse.ok) {
      const message = await llmResponse.text().catch(() => '');
      console.error('Mistral generate error:', llmResponse.status, message);
      return NextResponse.json({ error: 'LLM-API-Fehler bei der Szenario-Erzeugung.' }, { status: 502 });
    }

    const data = await llmResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = extractJson(content);

    const template = await prisma.simulationTemplate.create({
      data: {
        domain: 'medicine',
        type: simulationType.id,
        difficulty: difficulty.id,
        titleDe: String(parsed.titleDe ?? `${simulationType.short}: ${difficulty.label}`),
        titleTr: String(parsed.titleTr ?? `${simulationType.short}: ${difficulty.label}`),
        descriptionDe: String(parsed.descriptionDe ?? simulationType.description),
        descriptionTr: String(parsed.descriptionTr ?? ''),
        systemPrompt: String(parsed.systemPrompt ?? ''),
        evaluationCriteria: Array.isArray(parsed.evaluationCriteria) ? parsed.evaluationCriteria : [],
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
        maxTurns
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Generate simulation error:', error);
    return NextResponse.json({ error: 'Simulation konnte nicht erzeugt werden.' }, { status: 500 });
  }
}
