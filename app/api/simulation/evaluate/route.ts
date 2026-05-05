import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

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

function enforceTimingScore(scores: unknown, overTimeMinutes: number): Prisma.InputJsonObject {
  const normalized = scores && typeof scores === 'object' && !Array.isArray(scores)
    ? { ...(scores as Prisma.InputJsonObject) }
    : {};

  const current = Number(normalized.zeitmanagement ?? 10);
  const maxTimingScore = overTimeMinutes <= 0 ? 10 : overTimeMinutes <= 1 ? 5 : overTimeMinutes <= 3 ? 3 : 1;
  normalized.zeitmanagement = Math.max(0, Math.min(current, maxTimingScore));

  return normalized;
}

function languageModeEvaluationRules(languageMode: string) {
  if (languageMode === 'turkish_practice') {
    return `MUTTERSPRACHLICHER LERNMODUS:
Der Kandidat durfte auf Tuerkisch arbeiten. Bewerte diesen Durchlauf nicht als vollwertige deutsche Pruefungssimulation.
Bewerte stattdessen:
- ob die medizinische und kommunikative Absicht inhaltlich richtig war,
- welche deutschen Pruefungssaetze daraus entstehen muessen,
- welche Teile noch auf Deutsch automatisiert werden muessen,
- ob die Antwort trotz tuerkischer Arbeitssprache innerhalb der Zeit priorisiert war.
Kennzeichne im Feedback klar: "Lernmodus, nicht Pruefungsmodus".`;
  }

  if (languageMode === 'bilingual') {
    return 'ZWEISPRACHIGER MODUS: Bewerte die deutsche Pruefungsleistung, beruecksichtige aber, dass tuerkische Hilfen als Lernstuetze eingeblendet wurden.';
  }

  return 'PRUEFUNGSMODUS: Bewerte als deutsche FSP-Simulation ohne muttersprachliche Hilfe.';
}

type RegionalRequirement = {
  type?: unknown;
  title?: unknown;
  severity?: unknown;
  trainingImpact?: unknown;
};

function getEvaluationCriteriaContext(criteria: unknown) {
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    return {
      regionName: '',
      requirementsText: 'Keine regionalen Anforderungen im Template gespeichert.',
      hintsText: 'Keine regionalen Bewertungshinweise im Template gespeichert.'
    };
  }

  const data = criteria as {
    regionName?: unknown;
    regionalRequirements?: unknown;
    regionalEvaluationHints?: unknown;
  };
  const requirements = Array.isArray(data.regionalRequirements)
    ? data.regionalRequirements as RegionalRequirement[]
    : [];
  const hints = typeof data.regionalEvaluationHints === 'string'
    ? data.regionalEvaluationHints
    : '';

  return {
    regionName: typeof data.regionName === 'string' ? data.regionName : '',
    requirementsText: requirements.length > 0
      ? requirements.map((requirement) => {
          return [
            `- ${String(requirement.title ?? 'Regionale Anforderung')}`,
            `Typ: ${String(requirement.type ?? 'unbekannt')}`,
            `Prioritaet: ${String(requirement.severity ?? 'important')}`,
            `Trainingswirkung: ${String(requirement.trainingImpact ?? '')}`
          ].join(' | ');
        }).join('\n')
      : 'Keine regionalen Anforderungen im Template gespeichert.',
    hintsText: hints.trim() || 'Keine regionalen Bewertungshinweise im Template gespeichert.'
  };
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
    const elapsedMinutes = simulation.startedAt
      ? Math.max(0, Math.round((Date.now() - simulation.startedAt.getTime()) / 60000))
      : null;
    const timeLimitMinutes = Math.max(1, simulation.template.timeLimitMinutes);
    const overTimeMinutes = elapsedMinutes === null ? 0 : Math.max(0, elapsedMinutes - timeLimitMinutes);
    const timingStatus = overTimeMinutes > 0
      ? `ZEITUEBERSCHREITUNG: ${overTimeMinutes} Minuten ueber dem Limit`
      : 'innerhalb des Zeitlimits';
    const regionalContext = getEvaluationCriteriaContext(simulation.template.evaluationCriteria);
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

REGIONALE PRUEFUNGSANFORDERUNGEN:
Zielregion: ${regionalContext.regionName || 'nicht angegeben'}
${regionalContext.requirementsText}

REGIONALE BEWERTUNGSHINWEISE:
${regionalContext.hintsText}

REGEL FUER REGIONALE BEWERTUNG:
Wenn regionale Anforderungen vorhanden sind, bewerte sie explizit. Besonders Anforderungen mit Prioritaet "critical" muessen im Feedback und in den Checklisten-Kommentaren sichtbar werden.
Bei Berlin achte insbesondere auf Terminologie, Abkuerzungen und Laborwerte, falls diese im Szenario vorkommen.
Bei Sachsen achte insbesondere auf Selbstvorstellung, Diagnoseerklaerung gegenueber dem Patienten und zeitkritische Struktur.
Bei Bayern achte insbesondere auf das aerztliche Schriftstueck/Kurz-Arztbrief, falls Dokumentation geuebt wird.

ZEIT:
Striktes Pruefungslimit: ${timeLimitMinutes} Minuten
Tatsaechliche Uebungsdauer bis zur Auswertung: ${elapsedMinutes ?? 'unbekannt'} Minuten
Zeitstatus: ${timingStatus}
Sprachmodus: ${simulation.languageMode}
${languageModeEvaluationRules(simulation.languageMode)}

ZEITREGEL:
Zeitueberschreitungen sind in der FSP-Pruefung kritisch. Bewerte Zeitmanagement streng.
- Innerhalb des Limits: normale Bewertung.
- Bis 1 Minute ueber Limit: Zeitmanagement maximal 5/10.
- 2 bis 3 Minuten ueber Limit: Zeitmanagement maximal 3/10.
- Mehr als 3 Minuten ueber Limit: Zeitmanagement maximal 1/10.
Erwaehne jede Zeitueberschreitung deutlich im deutschen und tuerkischen Feedback.

GESPEICHERTER GESPRACHSVERLAUF:
${transcript || 'Keine Interaktionen vorhanden.'}

Antworte ausschliesslich als valides JSON:
{
  "feedbackDe": "Ausfuehrliches Feedback auf Deutsch mit Staerken, Verbesserungen und 3 konkreten Beispielsatz-Alternativen.",
  "feedbackTr": "Tuerkisches Coaching: Sprachfehler, bessere deutsche Formulierungen, Pruefungsstrategie und Zeitmanagement.",
  "scores": {
    "struktur": 0-10,
    "verstaendlichkeit": 0-10,
    "fachsprache": 0-10,
    "empathie": 0-10,
    "zeitmanagement": 0-10
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
        max_tokens: 3200,
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
        scores: enforceTimingScore(parsed.scores, overTimeMinutes),
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
