# ADAPTIVE ROADMAP UPDATES (`packages/learning-engine/src/roadmap-adaptive.ts`)

## Non-Destructive Regeneration & Impact Preview
- **`previewRoadmapRegeneration(...)`:** Computes exact preserved completed activities, effort hours delta, newly unlocked skills, and deadline warnings before applying any regeneration.
- **Progress Preservation:** Re-running `buildPersonalizedLearningPath(..., { previousPath })` indexes previously completed/in-progress activities (`skillId::type` and `id`), preserving learner completion history and logged `actualMinutes` across new assessments, goal changes, or availability updates.
- **Optional Local Llama Advisory:** Roadmaps are generated 100% deterministically offline; Local Llama 3.2 provides optional milestone tips and capstone suggestions only when initialized on-device.
