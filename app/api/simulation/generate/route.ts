import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { SIMULATION_TYPES, getDifficulty, getPracticeMode, getSimulationType } from '@/lib/topic-categories';

export const dynamic = 'force-dynamic';

type GeneratedExamPart = {
  type?: string;
  titleDe?: string;
  titleTr?: string;
  descriptionDe?: string;
  descriptionTr?: string;
  systemPrompt?: string;
  evaluationCriteria?: unknown;
  checklist?: unknown;
};

type PartConfig = {
  id: string;
  label: string;
  short: string;
  description: string;
  timeLimitMin: number;
};

function extractJson(content: string) {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function maxTurnsForDifficulty(difficultyId: string) {
  return difficultyId === 'beginner' ? 8 : difficultyId === 'intermediate' ? 10 : 12;
}

function getPartConfig(partKey: string): PartConfig | null {
  const normalizedKey = partKey === 'patient_interview' ? 'patient_conversation' : partKey;
  const staticPart = getSimulationType(normalizedKey);

  if (!staticPart) return null;

  return {
    id: partKey || staticPart.id,
    label: staticPart.label,
    short: staticPart.short,
    description: staticPart.description,
    timeLimitMin: staticPart.timeLimitMin
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const difficulty = getDifficulty(String(body?.difficulty ?? ''));
    const practiceMode = getPracticeMode(String(body?.practiceMode ?? 'single_part')) ?? getPracticeMode('single_part');
    const requestedPartKey = String(body?.partKey ?? body?.simulationType ?? '');
    const regionId = body?.regionId ? String(body.regionId) : user.targetRegionId;
    const regionContext = regionId
      ? await prisma.fspRegion.findUnique({
          where: { id: regionId },
          include: {
            examParts: { orderBy: { sequenceOrder: 'asc' } },
            requirements: true
          }
        })
      : null;
    const regionalPart = regionContext?.examParts.find((part) => part.partKey === requestedPartKey);
    const fallbackSimulationType = getPartConfig(requestedPartKey);
    const simulationType: PartConfig | null = regionalPart
      ? {
          id: regionalPart.partKey,
          label: regionalPart.title,
          short: regionalPart.title,
          description: regionalPart.requiredOutput ?? regionalPart.trainingImpact ?? regionalPart.setting ?? regionalPart.title,
          timeLimitMin: regionalPart.durationMinutes ?? 20
        }
      : fallbackSimulationType;
    const regionalRequirements = regionContext?.requirements.filter((requirement) => {
      if (practiceMode?.id === 'full_exam') return true;
      return !requirement.partKey || requirement.partKey === requestedPartKey;
    }) ?? [];
    const regionalPromptDirectives = regionalRequirements
      .flatMap((requirement) => Array.isArray(requirement.promptDirectives) ? requirement.promptDirectives : [])
      .map((item) => `- ${String(item)}`)
      .join('\n');
    const regionalEvaluationHints = regionalRequirements
      .flatMap((requirement) => Array.isArray(requirement.evaluationHints) ? requirement.evaluationHints : [])
      .map((item) => `- ${String(item)}`)
      .join('\n');
    const regionalRequirementSummary = regionalRequirements
      .map((requirement) => `- ${requirement.title}: ${requirement.trainingImpact}`)
      .join('\n');

    if (!difficulty || !practiceMode || (practiceMode.id === 'single_part' && !simulationType)) {
      return NextResponse.json({ error: 'Pruefungsteil und Schwierigkeit sind erforderlich.' }, { status: 400 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'MISTRAL_API_KEY fehlt in Vercel.' }, { status: 500 });
    }

    const maxTurns = maxTurnsForDifficulty(difficulty.id);

    if (practiceMode.id === 'full_exam') {
      const examId = `fsp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const prompt = `Du bist ein Experte fuer die deutsche Fachsprachenpruefung fuer internationale Aerztinnen und Aerzte.

Erstelle EINE zusammenhaengende komplette FSP-Pruefung als Fallkette.

Schwierigkeit: ${difficulty.label} - ${difficulty.description}
${regionContext ? `\nZiel-Bundesland: ${regionContext.name}\nRegionale Anforderungen:\n${regionalRequirementSummary || 'Keine besonderen Anforderungen hinterlegt.'}` : ''}

Wichtig:
- Alle drei Pruefungsteile muessen denselben Patientenfall verwenden.
- Teil 1: Arzt-Patienten-Gespraech, laienverstaendlich, Anamnese.
- Teil 2: Dokumentation, Aufnahmebericht/Kurzdokumentation auf Grundlage desselben Falls.
- Teil 3: Arzt-Arzt-Gespraech, strukturierte Fallvorstellung desselben Falls in Fachsprache.
- Die Informationen duerfen sich ueber die Teile entwickeln, aber nicht widersprechen.
- Zielgruppe: Aerztinnen und Aerzte aus der Tuerkei, zweisprachige Lernhilfe Deutsch/Tuerkisch.
- Es geht um Sprachkompetenz, Struktur, Zeitmanagement und Pruefungsstrategie.
- Alle Teile sind zeitkritisch. Das Szenario muss realistisch innerhalb des jeweiligen Zeitlimits trainierbar sein.
${regionalPromptDirectives ? `\nRegionale Prompt-Vorgaben:\n${regionalPromptDirectives}` : ''}

Antworte ausschliesslich als valides JSON:
{
  "caseTitleDe": "Kurzer deutscher Titel des Gesamtfalls",
  "caseTitleTr": "Kurzer tuerkischer Titel des Gesamtfalls",
  "parts": [
    {
      "type": "patient_conversation",
      "titleDe": "Teil 1: ...",
      "titleTr": "Bolum 1: ...",
      "descriptionDe": "Konkrete Aufgabenstellung auf Deutsch, 3-5 Saetze",
      "descriptionTr": "Tuerkische Orientierung",
      "systemPrompt": "Ausfuehrliche Rollenbeschreibung fuer den Chat, mindestens 180 Woerter",
      "evaluationCriteria": ["Kriterium 1", "Kriterium 2"],
      "checklist": [
        {"id":"1","textDe":"Pruefpunkt","textTr":"Tuerkische Uebersetzung","category":"Kommunikation","weight":2}
      ]
    }
  ]
}

Erzeuge genau 3 parts in dieser Reihenfolge: patient_conversation, documentation, doctor_conversation.
Jede Checkliste: 8 bis 12 Items. weight: 1 normal, 2 wichtig, 3 kritisch.`;

      const llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 5000,
          response_format: { type: 'json_object' }
        })
      });

      if (!llmResponse.ok) {
        const message = await llmResponse.text().catch(() => '');
        console.error('Mistral full exam generate error:', llmResponse.status, message);
        return NextResponse.json({ error: 'LLM-API-Fehler bei der Gesamtpruefung.' }, { status: 502 });
      }

      const data = await llmResponse.json();
      const content = data?.choices?.[0]?.message?.content ?? '{}';
      const parsed = extractJson(content);
      const parts: GeneratedExamPart[] = Array.isArray(parsed.parts) ? parsed.parts : [];

      const templates = await Promise.all(SIMULATION_TYPES.map((part, index) => {
        const parsedPart = parts.find((item) => item?.type === part.id) ?? parts[index] ?? {};

        return prisma.simulationTemplate.create({
          data: {
            domain: `full_exam:${examId}`,
            type: part.id,
            difficulty: difficulty.id,
            titleDe: String(parsedPart.titleDe ?? `Teil ${index + 1}: ${part.short}`),
            titleTr: String(parsedPart.titleTr ?? `Bolum ${index + 1}: ${part.short}`),
            descriptionDe: String(parsedPart.descriptionDe ?? part.description),
            descriptionTr: String(parsedPart.descriptionTr ?? ''),
            systemPrompt: String(parsedPart.systemPrompt ?? ''),
            evaluationCriteria: {
              mode: 'full_exam',
              examId,
              caseTitleDe: String(parsed.caseTitleDe ?? 'FSP-Gesamtpruefung'),
              caseTitleTr: String(parsed.caseTitleTr ?? ''),
              partOrder: index + 1,
              timeLimitMinutes: part.timeLimitMin,
              timingPolicy: 'strict',
              regionId: regionContext?.id ?? null,
              regionName: regionContext?.name ?? null
            },
            checklist: Array.isArray(parsedPart.checklist) ? parsedPart.checklist : [],
            maxTurns,
            timeLimitMinutes: part.timeLimitMin
          }
        });
      }));

      return NextResponse.json({
        mode: 'full_exam',
        examId,
        firstTemplateId: templates[0].id,
        templates
      });
    }

    if (!simulationType) {
      return NextResponse.json({ error: 'Pruefungsteil ist erforderlich.' }, { status: 400 });
    }

    const prompt = `Du bist ein Experte fuer die deutsche Fachsprachenpruefung fuer internationale Aerztinnen und Aerzte.

Erstelle ein realistisches FSP-Uebungsszenario.

Pruefungsteil: ${simulationType.label}
Beschreibung: ${simulationType.description}
Schwierigkeit: ${difficulty.label} - ${difficulty.description}
${regionContext ? `\nZiel-Bundesland: ${regionContext.name}\nRegionale Anforderungen:\n${regionalRequirementSummary || 'Keine besonderen Anforderungen hinterlegt.'}` : ''}

Wichtig:
- Es geht um Sprachkompetenz, nicht um medizinisches Fachwissen.
- Das Szenario soll in Notaufnahme oder stationaerer Aufnahme spielen.
- Erfinde konkrete Patientendaten: Name, Alter, Beruf, Hauptbeschwerde, relevante Vorgeschichte.
- Bei Teil 1 muss die Sprache laienverstaendlich sein.
- Bei Teil 3 ist Fachsprache gewuenscht.
- Die Checkliste bewertet Kommunikation, Struktur und sprachliche Angemessenheit.
- Das Zeitlimit von ${simulationType.timeLimitMin} Minuten ist strikt. Aufgabe, Rollenverhalten und Checkliste muessen Zeitmanagement bewerten.
${regionalPromptDirectives ? `\nRegionale Prompt-Vorgaben:\n${regionalPromptDirectives}` : ''}

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
        evaluationCriteria: {
          criteria: Array.isArray(parsed.evaluationCriteria) ? parsed.evaluationCriteria : [],
          timeLimitMinutes: simulationType.timeLimitMin,
          timingPolicy: 'strict',
          regionId: regionContext?.id ?? null,
          regionName: regionContext?.name ?? null,
          regionalRequirements: regionalRequirements.map((requirement) => ({
            type: requirement.requirementType,
            title: requirement.title,
            severity: requirement.severity,
            trainingImpact: requirement.trainingImpact
          })),
          regionalEvaluationHints
        },
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
        maxTurns,
        timeLimitMinutes: simulationType.timeLimitMin
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Generate simulation error:', error);
    return NextResponse.json({ error: 'Simulation konnte nicht erzeugt werden.' }, { status: 500 });
  }
}
