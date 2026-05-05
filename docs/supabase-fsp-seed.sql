-- Seed training-ready FSP region data for Bayern, Sachsen, and Berlin.
-- Run this after the base tables have been created.

insert into fsp_sources
(region_id, title, publisher, url, source_type, last_verified_at, notes)
values
(
  'bayern',
  'Fachsprachenprüfung',
  'Bayerische Landesärztekammer',
  'https://www.blaek.de/wegweiser/fachsprachenpruefung',
  'official',
  now(),
  'Beschreibt Art und Gliederung des Sprachtests, darunter Arzt-Patienten-Gespräch, ärztliches Schriftstück und Arzt-Arzt-Gespräch.'
),
(
  'sachsen',
  'Fachsprachenprüfung',
  'Sächsische Landesärztekammer',
  'https://www.slaek.de/de/arzt/auslaendische-aerzte/fachsprachenpruefung.php',
  'official',
  now(),
  'Beschreibt Ablauf, Prüfungskommission, drei Prüfungsteile, Bewertungshinweise und Wiederholbarkeit.'
),
(
  'berlin',
  'Fachsprachprüfung',
  'Ärztekammer Berlin',
  'https://www.aekb.de/10arzt/61_Fachsprachpruefung/index.html',
  'official',
  now(),
  'Beschreibt drei Prüfungsteile, Bewertung, Bestehensgrenze und Detailanforderungen im ärztlichen Gespräch.'
),
(
  'berlin',
  'Hinweise zum Fachsprachentest für Ärztinnen/Ärzte',
  'Landesamt für Gesundheit und Soziales Berlin',
  'https://www.berlin.de/lageso/_assets/gesundheit/berufe-im-gesundheitswesen/akademisch/aerztin-arzt/information_fachsprachentest_arzt.pdf',
  'official_pdf',
  now(),
  'Ergänzende Hinweise zu Anmeldung, Ort, Ablauf und Anforderungen.'
);

insert into fsp_exam_parts
(region_id, part_key, title, duration_minutes, sequence_order, setting, language_focus, required_output, is_core_part, verification_status, training_impact, source_refs)
values
(
  'bayern',
  'patient_interview',
  'Simuliertes Arzt-Patienten-Gespräch',
  20,
  1,
  'Einzelprüfung mit simulierter Kommunikation zwischen Arzt und Patient.',
  array['Hörverstehen', 'mündlicher Ausdruck', 'patientengerechte Kommunikation'],
  'Strukturiertes Anamnesegespräch mit patientengerechter Erklärung.',
  true,
  'source_checked_needs_detail_review',
  'Patientenrolle soll auf unklare Fachsprache, fehlende Struktur und unvollständige Anamnese reagieren.',
  array['bayern-blaek-fsp']
),
(
  'bayern',
  'documentation',
  'Ärztliches Schriftstück',
  20,
  2,
  'Anfertigen eines in der ärztlichen Berufsausübung üblichen Schriftstücks, zum Beispiel Kurz-Arztbrief.',
  array['schriftlicher Ausdruck', 'medizinische Fachsprache', 'Struktur'],
  'Kurz-Arztbrief oder vergleichbares ärztliches Schriftstück.',
  true,
  'source_checked_needs_detail_review',
  'Dokumentationsmodus muss strukturierte medizinische Schriftlichkeit trainieren, nicht nur freie Chat-Antworten.',
  array['bayern-blaek-fsp']
),
(
  'bayern',
  'doctor_conversation',
  'Gespräch mit einem anderen Arzt',
  20,
  3,
  'Fachlicher Austausch mit einer ärztlichen Kollegin oder einem ärztlichen Kollegen.',
  array['Fachsprache', 'strukturierte Fallvorstellung', 'kollegiale Kommunikation'],
  'Mündliche Fallvorstellung und Beantwortung fachsprachlicher Rückfragen.',
  true,
  'source_checked_needs_detail_review',
  'Gegenrolle soll fachsprachlich nachfragen und strukturierte Übergabe erzwingen.',
  array['bayern-blaek-fsp']
),
(
  'sachsen',
  'intro_self_presentation',
  'Kurze persönliche Vorstellung',
  2,
  0,
  'Zu Beginn stellt sich die Prüfungskommission vor und bittet den Kandidaten, sich kurz vorzustellen.',
  array['spontanes Sprechen', 'beruflicher Werdegang', 'Zielklarheit'],
  'Kurze strukturierte Vorstellung der eigenen Person, des bisherigen Werdegangs und der beruflichen Ziele.',
  false,
  'source_checked',
  'Sachsen-Training sollte eine kurze Warm-up-Aufgabe für Selbstvorstellung enthalten.',
  array['sachsen-slaek-fsp']
),
(
  'sachsen',
  'patient_interview',
  'Arzt-Patienten-Gespräch',
  20,
  1,
  'Anamnesegespräch mit einem Patienten, dessen Rolle ein Mitglied der Prüfungskommission übernimmt.',
  array['Anamnese', 'Verdachtsdiagnosen erklären', 'Untersuchungs- und Behandlungsvorschläge', 'medizinisches Vokabular'],
  'Anamnese mit Verdachts- und Differentialdiagnosen sowie Vorschlägen zur Diagnostik und Therapie.',
  true,
  'source_checked',
  'Patientensimulation soll Informationen gestaffelt geben und Rückfragen zu Verdachtsdiagnosen, Diagnostik und Therapie auslösen.',
  array['sachsen-slaek-fsp']
),
(
  'sachsen',
  'documentation',
  'Schriftliche Kommunikation',
  20,
  2,
  'Schriftlicher Teil auf Grundlage der erhobenen Informationen.',
  array['schriftliche Fachsprache', 'Struktur', 'korrekte Wiedergabe'],
  'Strukturierte medizinische Dokumentation.',
  true,
  'source_checked_needs_detail_review',
  'Dokumentationsmodus soll die korrekte, knappe und fachsprachliche Wiedergabe des Patientenfalls bewerten.',
  array['sachsen-slaek-fsp']
),
(
  'sachsen',
  'doctor_conversation',
  'Arzt-Arzt-Gespräch',
  20,
  3,
  'Fachlicher Austausch im Prüfungsausschuss.',
  array['Fachsprache', 'Fallvorstellung', 'Rückfragen beantworten'],
  'Strukturierte fachsprachliche Darstellung und Beantwortung medizinischer Rückfragen.',
  true,
  'source_checked',
  'Arzt-Arzt-Modus soll klare Fallstruktur und belastbare fachsprachliche Antworten verlangen.',
  array['sachsen-slaek-fsp']
),
(
  'berlin',
  'patient_interview',
  'Simulationsanamnese',
  20,
  1,
  'Simuliertes Arzt-Patienten-Gespräch in einer alltagsnahen Gesprächssituation.',
  array['Anamnese', 'Laiensprache', 'Hörverstehen', 'Empathie'],
  'Patientengespräch mit persönlichen Angaben, aktuellen Beschwerden, Vorerkrankungen, Medikamenten- und Familienanamnese.',
  true,
  'source_checked',
  'Berlin-Training soll vollständige Anamnesestruktur, Verzicht auf unnötige Fachbegriffe und gute Reaktion auf Rückfragen bewerten.',
  array['berlin-aekb-fsp', 'berlin-lageso-hinweise']
),
(
  'berlin',
  'documentation',
  'Schriftliche Dokumentation der Simulationsanamnese',
  20,
  2,
  'Schriftliche Dokumentation auf Grundlage der Simulationsanamnese.',
  array['Schreiben', 'Struktur', 'medizinische Fachsprache'],
  'Strukturierte schriftliche Wiedergabe des Falls.',
  true,
  'source_checked',
  'Dokumentationsmodus soll aus dem Gespräch automatisch einen Erwartungshorizont ableiten und fehlende Angaben markieren.',
  array['berlin-aekb-fsp', 'berlin-lageso-hinweise']
),
(
  'berlin',
  'doctor_conversation',
  'Ärztliches Gespräch',
  20,
  3,
  'Patientenvorstellung und fachlicher Austausch mit Prüferinnen oder Prüfern.',
  array['Fachsprache', 'Fallvorstellung', 'medizinische Terminologie', 'Zahlen und Einheiten'],
  'Patient vorstellen, Rückfragen beantworten, Fachbegriffe übersetzen, Abkürzungen vervollständigen und Laborwerte korrekt vorlesen.',
  true,
  'source_checked',
  'Berlin braucht zusätzlich einen Terminologie-, Abkürzungs- und Laborwerte-Drill im Arzt-Arzt-Modus.',
  array['berlin-aekb-fsp']
)
on conflict (region_id, part_key) do update set
  title = excluded.title,
  duration_minutes = excluded.duration_minutes,
  sequence_order = excluded.sequence_order,
  setting = excluded.setting,
  language_focus = excluded.language_focus,
  required_output = excluded.required_output,
  is_core_part = excluded.is_core_part,
  verification_status = excluded.verification_status,
  training_impact = excluded.training_impact,
  source_refs = excluded.source_refs;

insert into fsp_region_requirements
(region_id, part_key, requirement_type, title, description, training_impact, severity, examples, evaluation_hints, prompt_directives, verification_status, source_refs)
values
(
  'bayern',
  null,
  'timing',
  'Zeitlimit strikt einhalten',
  'Die Prüfung ist zeitkritisch. Antworten müssen nicht nur inhaltlich korrekt, sondern innerhalb des jeweiligen Prüfungsteils abgeschlossen sein.',
  'Jede Bayern-Simulation soll mit sichtbarem Countdown, Zeitwarnung und strenger Zeitmanagement-Bewertung laufen.',
  'critical',
  '["Countdown pro Prüfungsteil", "Warnung bei drei Minuten Restzeit", "deutliche Abwertung bei Überschreitung"]'::jsonb,
  '["Zeitüberschreitung immer explizit markieren", "Zeitmanagement bei Überschreitung deckeln", "Feedback mit Kürzungsstrategie geben"]'::jsonb,
  '["Halte Rollenantworten knapp genug, damit der Kandidat im Zeitlimit weiterarbeiten kann."]'::jsonb,
  'source_checked_needs_detail_review',
  array['bayern-blaek-fsp']
),
(
  'bayern',
  'documentation',
  'documentation',
  'Kurz-Arztbrief als Trainingsziel',
  'Die bayerische Quelle nennt als Beispiel ein übliches ärztliches Schriftstück, etwa einen Kurz-Arztbrief an einen Berufskollegen.',
  'Die App sollte für Bayern mindestens eine Kurz-Arztbrief-Variante mit festen Feldern und Bewertung anbieten.',
  'critical',
  '["Aufnahmegrund", "Anamnese", "Befund", "Verdachtsdiagnose", "Procedere"]'::jsonb,
  '["Prüfe Vollständigkeit", "Prüfe fachsprachliche Präzision", "Prüfe logische Reihenfolge"]'::jsonb,
  '["Erzeuge Dokumentationsaufgaben als ärztliches Schriftstück mit klarer Adressatenrolle."]'::jsonb,
  'source_checked_needs_detail_review',
  array['bayern-blaek-fsp']
),
(
  'sachsen',
  null,
  'timing',
  'Drei Prüfungsteile mit jeweils ca. 20 Minuten trainieren',
  'Die sächsische Quelle nennt drei Teile mit jeweils ca. 20 Minuten Dauer. Zeitüberschreitungen sind daher als kritischer Trainingsfehler zu behandeln.',
  'Sachsen-Training soll jeden Kernteil mit 20-Minuten-Countdown, automatischer Sperre nach Ablauf und strenger Zeitbewertung durchführen.',
  'critical',
  '["20 Minuten Anamnese", "20 Minuten Dokumentation", "20 Minuten Arzt-Arzt-Gespräch"]'::jsonb,
  '["Prüfe, ob der Kandidat im Zeitfenster abgeschlossen hat", "Bewerte Struktur und Kürze", "Gib eine 3-Minuten-Rettungsstrategie"]'::jsonb,
  '["Simuliere realistischen Zeitdruck und vermeide unnötig lange Gegenrollen-Antworten."]'::jsonb,
  'source_checked',
  array['sachsen-slaek-fsp']
),
(
  'sachsen',
  'intro_self_presentation',
  'formal',
  'Selbstvorstellung zu Beginn vorbereiten',
  'Die Prüfung beginnt laut Quelle mit Vorstellung der Kommission und einer kurzen Vorstellung des Kandidaten mit bisherigem Werdegang und weiteren Zielen.',
  'Die App sollte vor der Simulation eine 60- bis 90-Sekunden-Selbstvorstellung trainieren und als Sachsen-Besonderheit markieren.',
  'important',
  '["Name und Herkunft", "Studium und Berufserfahrung", "Fachliches Ziel in Deutschland"]'::jsonb,
  '["Prüfe klare Chronologie", "Prüfe sichere Vergangenheitsformen", "Prüfe professionelle Kürze"]'::jsonb,
  '["Starte Sachsen-Gesamtprüfungen mit einer kurzen Selbstvorstellungsaufforderung."]'::jsonb,
  'source_checked',
  array['sachsen-slaek-fsp']
),
(
  'sachsen',
  'patient_interview',
  'communication',
  'Verdachts- und Differentialdiagnosen mit Patient besprechen',
  'Die Quelle nennt, dass Verdachts- und Differentialdiagnosen, diagnostische Maßnahmen und Therapien besprochen werden.',
  'Die Patientenrolle sollte aktiv nach Diagnose, Untersuchungen und Therapie fragen; Bewertung prüft verständliche Erklärung und Gesprächssteuerung.',
  'critical',
  '["Was vermuten Sie, was ich habe?", "Welche Untersuchungen brauchen wir?", "Was passiert danach?"]'::jsonb,
  '["Prüfe patientengerechte Erklärung", "Prüfe Umgang mit Unsicherheit", "Prüfe sinnvolle Reihenfolge"]'::jsonb,
  '["Lasse die Patientenrolle bei unklarer Erklärung nachfragen."]'::jsonb,
  'source_checked',
  array['sachsen-slaek-fsp']
),
(
  'berlin',
  null,
  'timing',
  'Drei Prüfungsteile mit jeweils 20 Minuten strikt einhalten',
  'Berlin beschreibt die drei Prüfungsteile mit jeweils 20 Minuten. Das Training muss deshalb unter strengem Countdown stattfinden.',
  'Berlin-Training soll nach Ablauf keine weiteren Antworten werten und Zeitüberschreitungen im Feedback deutlich bestrafen.',
  'critical',
  '["20 Minuten Simulationsanamnese", "20 Minuten Dokumentation", "20 Minuten ärztliches Gespräch"]'::jsonb,
  '["Zeitmanagement ist ein eigener Score", "Bei Überschreitung Score deckeln", "Feedback muss konkrete Kürzungs- und Priorisierungsstrategie enthalten"]'::jsonb,
  '["Baue Aufgaben so, dass sie in 20 Minuten realistisch lösbar sind, aber Zeitdruck erzeugen."]'::jsonb,
  'source_checked',
  array['berlin-aekb-fsp', 'berlin-lageso-hinweise']
),
(
  'berlin',
  'doctor_conversation',
  'terminology',
  'Fachbegriffe ins Deutsche übersetzen',
  'Die Berliner Quelle nennt im ärztlichen Gespräch die Übersetzung von fünf medizinischen Fachbegriffen ins Deutsche.',
  'Die App sollte für Berlin einen kurzen Fachbegriffsblock nach der Fallvorstellung einbauen.',
  'critical',
  '["Cephalgie -> Kopfschmerzen", "Dyspnoe -> Atemnot"]'::jsonb,
  '["Prüfe korrekte laienverständliche Entsprechung", "Prüfe Aussprache oder Schreibweise, falls Audio verfügbar ist"]'::jsonb,
  '["Füge im Berliner Arzt-Arzt-Gespräch fünf Fachbegriffsfragen hinzu."]'::jsonb,
  'source_checked',
  array['berlin-aekb-fsp']
),
(
  'berlin',
  'doctor_conversation',
  'abbreviations',
  'Medizinische Abkürzungen vervollständigen',
  'Die Berliner Quelle nennt zwei medizinische Abkürzungen, die im ärztlichen Gespräch vervollständigt werden.',
  'Die App sollte einen kleinen Abkürzungsdrill in Berliner Gesamtprüfungen anbieten.',
  'important',
  '["RR", "CT", "EKG"]'::jsonb,
  '["Prüfe ausgeschriebene Form", "Prüfe Kontextverständnis"]'::jsonb,
  '["Füge zwei Abkürzungsfragen nach der Fallvorstellung hinzu."]'::jsonb,
  'source_checked',
  array['berlin-aekb-fsp']
),
(
  'berlin',
  'doctor_conversation',
  'lab_values',
  'Laborwerte mit Zahlen und Maßeinheiten korrekt vorlesen',
  'Berlin nennt drei Laborwerte mit Zahlen und Maßeinheiten als Bestandteil des ärztlichen Gesprächs.',
  'Die App sollte Laborwertkarten mit Zahlen, Einheiten und Aussprachetraining erzeugen.',
  'critical',
  '["CRP 85 mg/l", "Leukozyten 14,2 /nl", "Hb 10,8 g/dl"]'::jsonb,
  '["Prüfe Zahlverständnis", "Prüfe Einheit", "Prüfe medizinisch plausible Lesung"]'::jsonb,
  '["Füge drei Laborwert-Leseaufgaben in Berliner Arzt-Arzt-Simulationen hinzu."]'::jsonb,
  'source_checked',
  array['berlin-aekb-fsp']
);
