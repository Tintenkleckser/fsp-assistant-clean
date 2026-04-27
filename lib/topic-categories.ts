export const DIFFICULTY_LEVELS = [
  {
    id: 'beginner',
    label: 'Einsteiger',
    description: 'Kooperativer Patient, klare Symptome und einfache Situation.'
  },
  {
    id: 'intermediate',
    label: 'Mittel',
    description: 'Realistisches Szenario wie in der Prüfung, mit Rückfragen und Sorgen.'
  },
  {
    id: 'advanced',
    label: 'Fortgeschritten',
    description: 'Schwieriger Patient, Emotionen, mehrere Beschwerden und Zeitdruck.'
  }
] as const;

export const SIMULATION_TYPES = [
  {
    id: 'patient_conversation',
    label: 'Teil 1: Arzt-Patienten-Gespräch',
    short: 'Anamnese',
    description: 'Anamnesegespräch mit einem Patienten in laienverständlicher Sprache.',
    timeLimitMin: 20
  },
  {
    id: 'documentation',
    label: 'Teil 2: Dokumentation',
    short: 'Dokumentation',
    description: 'Kurzdokumentation und Aufnahmebericht auf Grundlage eines Falls.',
    timeLimitMin: 20
  },
  {
    id: 'doctor_conversation',
    label: 'Teil 3: Arzt-Arzt-Gespräch',
    short: 'Übergabe',
    description: 'Strukturierte Fallvorstellung an eine ärztliche Kollegin oder einen Kollegen.',
    timeLimitMin: 20
  }
] as const;

export const PRACTICE_MODES = [
  {
    id: 'single_part',
    label: 'Einzelteil üben',
    description: 'Gezielt einen Prüfungsteil trainieren: Anamnese, Dokumentation oder Übergabe.'
  },
  {
    id: 'full_exam',
    label: 'Gesamte Prüfung',
    description: 'Ein zusammenhängender Fall durch alle drei Prüfungsteile in der richtigen Reihenfolge.'
  }
] as const;

export type DifficultyId = (typeof DIFFICULTY_LEVELS)[number]['id'];
export type PracticeModeId = (typeof PRACTICE_MODES)[number]['id'];
export type SimulationTypeId = (typeof SIMULATION_TYPES)[number]['id'];

export function getDifficulty(id: string) {
  return DIFFICULTY_LEVELS.find((difficulty) => difficulty.id === id);
}

export function getSimulationType(id: string) {
  return SIMULATION_TYPES.find((simulationType) => simulationType.id === id);
}

export function getPracticeMode(id: string) {
  return PRACTICE_MODES.find((practiceMode) => practiceMode.id === id);
}
