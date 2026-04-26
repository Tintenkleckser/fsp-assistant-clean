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
    label: 'Teil 1: Arzt-Patienten-Gespraech',
    short: 'Anamnese',
    description: 'Anamnesegespraech mit einem Patienten in laienverstaendlicher Sprache.',
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
    label: 'Teil 3: Arzt-Arzt-Gespraech',
    short: 'Uebergabe',
    description: 'Strukturierte Fallvorstellung an eine aerztliche Kollegin oder einen Kollegen.',
    timeLimitMin: 20
  }
] as const;

export type DifficultyId = (typeof DIFFICULTY_LEVELS)[number]['id'];
export type SimulationTypeId = (typeof SIMULATION_TYPES)[number]['id'];

export function getDifficulty(id: string) {
  return DIFFICULTY_LEVELS.find((difficulty) => difficulty.id === id);
}

export function getSimulationType(id: string) {
  return SIMULATION_TYPES.find((simulationType) => simulationType.id === id);
}
