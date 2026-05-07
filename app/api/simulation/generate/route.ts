import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { GenerateSimulationRequestSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import { SIMULATION_TYPES, getDifficulty, getPracticeMode, getSimulationType } from '@/lib/topic-categories';

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

function getRegionalContext(regionId: string | null) {
  if (!regionId) return Promise.resolve(null);
  
  return prisma.fspRegion.findUnique({
    where: { id: regionId },
    include: {
      examParts: { orderBy: { sequenceOrder: 'asc' } },
      requirements: true
    }
  });
}

function buildRegionalPromptDirectives(regionContext: any, practiceMode: any, requestedPartKey: string) {
  if (!regionContext) return '';
  
  const regionalRequirements = regionContext.requirements.filter((requirement: any) => {
    if (practiceMode?.id === 'full_exam') return true;
    return !requirement.partKey || requirement.partKey === requestedPartKey;
  });
  
  return regionalRequirements
    .flatMap((requirement: any) => Array.isArray(requirement.promptDirectives) ? requirement.promptDirectives : [])
    .map((item: any) => `- ${String(item)}`)
    .join('\n');
}

function buildRegionalEvaluationHints(regionContext: any, practiceMode: any, requestedPartKey: string) {
  if (!regionContext) return '';
  
  const regionalRequirements = regionContext.requirements.filter((requirement: any) => {
    if (practiceMode?.id === 'full_exam') return true;
    return !requirement.partKey || requirement.partKey === requestedPartKey;
  });
  
  return regionalRequirements
    .flatMap((requirement: any) => Array.isArray(requirement.evaluationHints) ? requirement.evaluationHints : [])
    .map((item: any) => `- ${String(item)}`)
    .join('\n');
}

function buildRegionalRequirementSummary(regionContext: any, practiceMode: any, requestedPartKey: string) {
  if (!regionContext) return '';
  
  const regionalRequirements = regionContext.requirements.filter((requirement: any) => {
    if (practiceMode?.id === 'full_exam') return true;
    return !requirement.partKey || requirement.partKey === requestedPartKey;
  });
  
  return regionalRequirements
    .map((requirement: any) => `- ${requirement.title}: ${requirement.trainingImpact}`)
    .join('\n');
}

async function generateFullExam(
  difficulty: any,
  practiceMode: any,
  regionContext: any,
  maxTurns: number
) {
  const examId = `fsp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const regionalRequirementSummary = buildRegionalRequirementSummary(regionContext, practiceMode, '');
  const regionalPromptDirectives = buildRegionalPromptDirectives(regionContext, practiceMode, '');

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

  if (!process.env.MISTRAL_API_KEY) {
    throw new ApiError(500, 'MISTRAL_API_KEY fehlt in Vercel.');
  }

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
    logger.error('Mistral full exam generate error', {
      status: llmResponse.status,
      message
    });
    throw new ApiError(502, 'LLM-API-Fehler bei der Gesamtpruefung.');
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

  return {
    mode: 'full_exam',
    examId,
    firstTemplateId: templates[0].id,
    templates
  };
}

async function generateSinglePart(
  simulationType: PartConfig,
  difficulty: any,
  regionContext: any,
  maxTurns: number
) {
  const regionalRequirementSummary = buildRegionalRequirementSummary(regionContext, null, simulationType.id);
  const regionalPromptDirectives = buildRegionalPromptDirectives(regionContext, null, simulationType.id);
  const regionalEvaluationHints = buildRegionalEvaluationHints(regionContext, null, simulationType.id);

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

  if (!process.env.MISTRAL_API_KEY) {
    throw new ApiError(500, 'MISTRAL_API_KEY fehlt in Vercel.');
  }

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
    logger.error('Mistral generate error', {
      status: llmResponse.status,
      message
    });
    throw new ApiError(502, 'LLM-API-Fehler bei der Szenario-Erzeugung.');
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
        regionalRequirements: regionContext?.requirements.map((requirement: any) => ({
          type: requirement.requirementType,
          title: requirement.title,
          severity: requirement.severity,
          trainingImpact: requirement.trainingImpact
        })) ?? [],
        regionalEvaluationHints
      },
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
      maxTurns,
      timeLimitMinutes: simulationType.timeLimitMin
    }
  });

  return template;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return withAuth(async (user) => {
    try {
      const body = await request.json();
      
      // Validate request body
      const { difficulty: difficultyId, practiceMode: practiceModeId, partKey, regionId } = body;
      
      const difficulty = getDifficulty(String(difficultyId ?? ''));
      const practiceMode = getPracticeMode(String(practiceModeId ?? 'single_part')) ?? getPracticeMode('single_part');
      const requestedPartKey = String(partKey ?? body?.simulationType ?? '');
      const targetRegionId = regionId ? String(regionId) : user.targetRegionId;

      if (!difficulty || !practiceMode) {
        throw new ApiError(400, 'Pruefungsteil und Schwierigkeit sind erforderlich.');
      }

      // Get regional context
      const regionContext = await getRegionalContext(targetRegionId);
      
      // Get simulation type
      const regionalPart = regionContext?.examParts.find((part: any) => part.partKey === requestedPartKey);
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

      if (practiceMode.id === 'full_exam') {
        if (!simulationType) {
          throw new ApiError(400, 'Pruefungsteil ist erforderlich.');
        }
        const maxTurns = maxTurnsForDifficulty(difficulty.id);
        const result = await generateFullExam(difficulty, practiceMode, regionContext, maxTurns);
        return NextResponse.json(result);
      }

      if (!simulationType) {
        throw new ApiError(400, 'Pruefungsteil ist erforderlich.');
      }

      const maxTurns = maxTurnsForDifficulty(difficulty.id);
      const template = await generateSinglePart(simulationType, difficulty, regionContext, maxTurns);
      
      return NextResponse.json(template);
    } catch (error) {
      logger.error('Generate simulation error', { error });
      return handleError(error);
    }
  });
}

// Disable GET for this endpoint
export const GET = async () => {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
};