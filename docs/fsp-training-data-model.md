# FSP Training Data Model

This app should treat regional FSP information as training logic, not as static reading material.

The first curated region set is:

- Bayern
- Sachsen
- Berlin

## Core Idea

Every regional fact should answer one practical question:

> How does this change the exercise, the prompt, the checklist, or the feedback?

For that reason, regional records include `trainingImpact`, `evaluationHints`, and `promptDirectives`.

## Tables

### `fsp_regions`

Stores the learner's target region.

Use it to:

- filter exam parts
- select regional requirements
- personalize simulation prompts
- personalize evaluation rubrics

### `fsp_sources`

Stores source provenance.

Use it to:

- show where an exam rule came from
- decide whether a rule is official, third-party, or a draft note
- re-check sources periodically

### `fsp_exam_parts`

Stores the regional exam flow.

Typical `partKey` values:

- `intro_self_presentation`
- `patient_interview`
- `documentation`
- `doctor_conversation`

Use it to:

- build the practice sequence
- set timers
- choose the right UI mode
- generate part-specific instructions

### `fsp_region_requirements`

Stores trainable regional differences.

Requirement types:

- `formal`
- `communication`
- `documentation`
- `terminology`
- `abbreviations`
- `lab_values`
- `timing`
- `scoring`

Use it to:

- add special blocks to a simulation
- adjust role behavior
- add checklist items
- add scoring criteria
- produce targeted feedback

Timing requirements with `severity: "critical"` should be treated as hard training constraints, not as optional hints.

Recommended timing behavior:

- show a countdown for every exam part
- warn at 3 minutes remaining
- stop accepting new answers after the limit
- keep "finish and evaluate" available after timeout
- cap the time-management score when the limit is exceeded
- include a concrete compression strategy in feedback

## Verification Status

Use conservative statuses:

- `draft`: entered from notes, not yet checked
- `source_checked_needs_detail_review`: official source checked, but details need confirmation before high-stakes use
- `source_checked`: official source checked and structured for training
- `needs_update`: probably stale

The app should never silently treat `draft` content as authoritative. It can still use it for internal testing.

## Prompt Assembly

When creating a simulation:

1. Load the user's `targetRegionId`.
2. Load all `fsp_exam_parts` for that region.
3. Load requirements for the selected `partKey`.
4. Add `promptDirectives` to the role prompt.
5. Add `evaluationHints` to the evaluator prompt.
6. Display source-backed regional hints in the briefing.

Example:

```ts
const regionContext = {
  region: "berlin",
  partKey: "doctor_conversation",
  requirements: [
    "ask five terminology questions",
    "ask two abbreviation questions",
    "ask three lab value reading questions"
  ]
};
```

## UI Consequences

The current chat UI is not enough for all parts.

Recommended modes:

- `patient_interview`: chat or voice roleplay
- `documentation`: structured editor
- `doctor_conversation`: structured oral handover plus terminology drills
- `intro_self_presentation`: short speaking/writing warm-up

Every mode must have a strict timebox. Correct answers after the time limit are training failures, because the real exam rewards complete, prioritized communication within the available time.

## Language Modes

Learners may need to work in their native language before they can produce stable German exam answers.

Supported modes:

- `german_only`: full exam simulation, all output in German
- `bilingual`: German roleplay plus short Turkish coaching
- `turkish_practice`: learner may answer in Turkish; the system converts the idea into compact German exam phrasing

`turkish_practice` is a learning bridge, not a passing exam attempt. Evaluations must label it clearly as learning mode while still enforcing timing. The useful output is:

- whether the candidate understood the medical and communicative task
- the German sentence they should learn
- the vocabulary gap
- the compression strategy needed for the time limit

## First Implementation Milestone

1. Import `prisma/seed-data/fsp-regions.json` into the new tables.
2. Add `targetRegionId` to the profile UI.
3. Show regional exam parts on the new simulation screen.
4. Inject regional `promptDirectives` into `/api/simulation/generate`.
5. Inject regional `evaluationHints` into `/api/simulation/evaluate`.
