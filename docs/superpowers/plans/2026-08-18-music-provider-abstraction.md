# Music Provider Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate ACE-Step/Replicate music generation behind a provider contract while preserving active jobs and recording legacy MiniMax/MusicGen tuning.

**Architecture:** Routes use a narrow music-generation provider interface for job creation and status lookup. The initial provider holds ACE-Step/Replicate input adaptation, prompt policy, and cost estimation; routes retain credits, storage persistence, and user-facing responses.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Replicate SDK, InsForge SDK, Gemini REST helper.

**Spec:** `docs/superpowers/specs/2026-08-18-music-provider-abstraction-design.md`

## Global Constraints

- Preserve `/api/music/generate` and `/api/music/[id]` response shapes, credit/refund behavior, `musics` storage bucket, RLS ownership, and 15-minute timeout.
- Do not select a new provider, add a database migration/webhook system, or refactor Replicate thumbnail generation.
- New jobs use `metadata.generation`; legacy processing jobs with `metadata.prediction_id` remain recoverable via `replicate-ace-step`.
- No ACE-Step ID/version, input adaptation, prompt limit, or music-cost constant may remain in routes, `lib/music.ts`, generic refinement, or generic cost logging.
- Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before completion.

---

## File structure

- `lib/music-generation/types.ts`: provider-neutral lifecycle contracts.
- `lib/music-generation/reference.ts`: metadata reader for modern and legacy jobs.
- `lib/music-generation/provider.ts`: registry/resolver for active and persisted provider IDs.
- `lib/music-generation/providers/replicate-ace-step.ts`: first provider adapter.
- `lib/music.ts`, `lib/refineStylePrompt.ts`, `lib/cost-logging.ts`: generic domain utilities after extraction.
- `lib/reconcile-music.ts` and music routes: provider consumers.
- `docs/legacy/minimax-musicgen-tuning.md`: historical, non-runtime tuning reference.

### Task 1: Provider contracts and legacy job reference

**Files:**
- Create: `lib/music-generation/types.ts`, `lib/music-generation/reference.ts`, `lib/music-generation/reference.test.ts`
- Modify: `lib/music.ts`

**Interfaces:** Produces all contracts used by following tasks.

- [ ] **Step 1: Write failing metadata-reference tests**

```ts
expect(resolveGenerationReference({
  model: "fishaudio/ace-step-1.5",
  metadata: { generation: { provider: "replicate-ace-step", job_id: "new-1", model: "fishaudio/ace-step-1.5" } },
})).toEqual({ provider: "replicate-ace-step", jobId: "new-1", model: "fishaudio/ace-step-1.5" });
expect(resolveGenerationReference({
  model: "fishaudio/ace-step-1.5", metadata: { prediction_id: "legacy-1" },
})).toEqual({ provider: "replicate-ace-step", jobId: "legacy-1", model: "fishaudio/ace-step-1.5" });
expect(resolveGenerationReference({ model: null, metadata: {} })).toBeNull();
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- lib/music-generation/reference.test.ts`

Expected: FAIL because no reference resolver exists.

- [ ] **Step 3: Implement minimal contracts and resolver**

```ts
export type GenerationReference = { provider: string; jobId: string; model: string };
export type MusicGenerationStatus =
  | { state: "pending" }
  | { state: "succeeded"; audioUrl: string }
  | { state: "failed"; error: string };
export interface MusicGenerationProvider {
  readonly id: string;
  readonly model: string;
  start(request: MusicGenerationRequest): Promise<StartedMusicGeneration>;
  getStatus(jobId: string): Promise<MusicGenerationStatus>;
}
```

`resolveGenerationReference` prefers complete `metadata.generation`, then maps a non-empty legacy `prediction_id` to `replicate-ace-step`, otherwise returns null. Remove ACE-Step constants and `buildAceStepInput` from `lib/music.ts`; retain music domain/UI types.

- [ ] **Step 4: Verify focused tests pass**

Run: `npm test -- lib/music-generation/reference.test.ts`

Expected: PASS for modern metadata, legacy fallback, and malformed values.

- [ ] **Step 5: Commit**

```bash
git add lib/music.ts lib/music-generation/types.ts lib/music-generation/reference.ts lib/music-generation/reference.test.ts
git commit -m "feat(music): add provider generation contracts"
```

### Task 2: Replicate ACE-Step provider adapter

**Files:**
- Create: `lib/music-generation/providers/replicate-ace-step.ts`, `lib/music-generation/providers/replicate-ace-step.test.ts`, `lib/music-generation/provider.ts`, `lib/music-generation/provider.test.ts`
- Modify: `lib/refineStylePrompt.ts`, `lib/refineStylePrompt.test.ts`, `lib/music.test.ts`

**Interfaces:** Consumes Task 1 contracts. Produces `replicateAceStepProvider`, `getActiveMusicGenerationProvider()`, and `getMusicGenerationProvider(id)`.

- [ ] **Step 1: Write failing adapter tests**

```ts
expect(buildAceStepInput({ prompt: "x", instrumental: true })).toEqual({
  prompt: "x", lyrics: "[Instrumental]", duration: 180, audio_format: "mp3",
});
expect(normalizeReplicateStatus({ status: "succeeded", output: ["https://audio"] }))
  .toEqual({ state: "succeeded", audioUrl: "https://audio" });
expect(normalizeReplicateStatus({ status: "canceled" }))
  .toEqual({ state: "failed", error: "generation canceled" });
expect(getMusicGenerationProvider("unknown")).toBeNull();
```

- [ ] **Step 2: Verify adapter tests fail**

Run: `npm test -- lib/music-generation/providers/replicate-ace-step.test.ts lib/music-generation/provider.test.ts`

Expected: FAIL because adapter and registry do not exist.

- [ ] **Step 3: Implement adapter and policy-driven refinement**

Keep all model specifics only in the adapter:

```ts
export const REPLICATE_ACE_STEP_PROVIDER_ID = "replicate-ace-step";
const ACE_STEP_MODEL = "fishaudio/ace-step-1.5";
const ACE_STEP_VERSION = "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85";
const ACE_STEP_DURATION_SECONDS = 180;
const ACE_STEP_COST_PER_SECOND_USD = 0.000178;
```

The adapter calls the generic refiner with a policy containing target label, 500-character cap, 400-character target, and existing descriptor direction. `start` creates the unchanged Replicate payload and returns job/model/effectivePrompt/duration/estimated cost. `getStatus` normalizes queued, failed/canceled, scalar output, array output, and empty output. The private registry validates all persisted provider IDs.

- [ ] **Step 4: Verify exact ACE-Step behavior remains**

Run: `npm test -- lib/music-generation/providers/replicate-ace-step.test.ts lib/music-generation/provider.test.ts lib/refineStylePrompt.test.ts`

Expected: PASS; generic refiner has no ACE-Step name or hard-coded limit.

- [ ] **Step 5: Commit**

```bash
git add lib/music-generation lib/refineStylePrompt.ts lib/refineStylePrompt.test.ts lib/music.test.ts
git commit -m "feat(music): isolate replicate ace-step provider"
```

### Task 3: Provider-neutral cost log

**Files:**
- Modify: `lib/cost-logging.ts`, `lib/cost-logging.test.ts`

**Interfaces:** Consumes `generationJobId`, `musicModel`, and `estimatedMusicCostUsd` from provider start; retains database `prediction_id` column for compatibility.

- [ ] **Step 1: Write failing arbitrary-provider-cost test**

```ts
const row = buildCostLogRow({
  userId: "user-1", musicId: "music-1", generationJobId: "job-1",
  musicModel: "future/model", durationSeconds: 60,
  estimatedMusicCostUsd: 0.42, lyricsSource: "user",
});
expect(row.prediction_id).toBe("job-1");
expect(row.estimated_music_cost_usd).toBe(0.42);
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- lib/cost-logging.test.ts`

Expected: FAIL because generic job/cost inputs are absent.

- [ ] **Step 3: Supply cost from provider**

Rename `predictionId` input to `generationJobId`, map it to unchanged row column `prediction_id`, require finite non-negative `estimatedMusicCostUsd`, and retain Gemini call counting/total calculation. Remove `ACE_STEP_COST_PER_SECOND_USD` from generic cost logging.

- [ ] **Step 4: Verify focused tests pass**

Run: `npm test -- lib/cost-logging.test.ts`

Expected: PASS for arbitrary music cost and existing Gemini-cost cases.

- [ ] **Step 5: Commit**

```bash
git add lib/cost-logging.ts lib/cost-logging.test.ts
git commit -m "refactor(music): make cost logging provider neutral"
```

### Task 4: Provider-backed generation, polling, and reconciliation

**Files:**
- Modify: `lib/reconcile-music.ts`, `lib/reconcile-music.test.ts`
- Modify: `app/api/music/generate/route.ts`, `app/api/music/[id]/route.ts`, `app/api/internal/reconcile-music/route.ts`

**Interfaces:** Consumes Tasks 1-3. Produces unchanged route responses and reconciliation outcomes.

- [ ] **Step 1: Rewrite reconciliation tests for normalized status**

```ts
getGenerationStatus: vi.fn().mockResolvedValue({ state: "succeeded", audioUrl }),
resolveProvider: vi.fn().mockReturnValue(provider),
```

Add modern metadata, legacy `prediction_id`, unknown provider (refund plus `no_prediction_id`), and thrown provider-client error (rethrow for retry, no refund) cases alongside existing pending/success/failure/timeout/idempotency cases.

- [ ] **Step 2: Verify reconciliation tests fail**

Run: `npm test -- lib/reconcile-music.test.ts`

Expected: FAIL because reconciliation still reads Replicate-shaped predictions.

- [ ] **Step 3: Replace direct music-provider calls in lifecycle routes**

`reconcileMusicRow` resolves a reference, finds its registered provider, calls `getStatus(jobId)`, and preserves upload, idempotency, timeout, and refund branches. The generation route selects the active provider before credit reservation, reserves using `provider.model`, starts provider and thumbnail concurrently, then stores:

```ts
generation: { provider: started.provider, job_id: started.jobId, model: started.model },
final_music_prompt: started.effectivePrompt,
```

Build the cost row from `started.jobId`, `started.model`, `started.durationSeconds`, and `started.estimatedMusicCostUsd`. The poll route injects user-scoped storage callbacks into shared reconciliation and returns unchanged music on a thrown provider exception; it keeps Replicate thumbnail behavior. The cron route selects modern or legacy jobs, injects admin persistence callbacks, and removes direct music-prediction Replicate usage.

- [ ] **Step 4: Verify lifecycle tests pass**

Run: `npm test -- lib/reconcile-music.test.ts lib/music-generation`

Expected: PASS for modern/legacy completion, refund, timeout, storage recovery, and retryable exceptions.

- [ ] **Step 5: Commit**

```bash
git add lib/reconcile-music.ts lib/reconcile-music.test.ts app/api/music/generate/route.ts app/api/music/[id]/route.ts app/api/internal/reconcile-music/route.ts
git commit -m "refactor(music): route lifecycle through provider"
```

### Task 5: Legacy record, current docs, and final verification

**Files:**
- Create: `docs/legacy/minimax-musicgen-tuning.md`
- Modify: `README.md`, `docs/ACE_STEP_PROMPT_ENGINEERING.md`, `PLAN.md`, `RESULT.md`, `RESULT_ARCHIVE.md`

**Interfaces:** Produces a historical non-runtime record and project completion record.

- [ ] **Step 1: Write legacy reference**

```md
# Legacy: MiniMax and MusicGen tuning notes
> Historical reference only. Do not use this file as an input-schema contract for the active or next provider.
## Portable tuning assets
## MiniMax-specific behavior
## MusicGen-era context
## Model-switch checklist
```

Document verified descriptor compilation, presets, refinement, lyric structure, and reference sanitization. Distinguish portable concepts from MiniMax-specific prompt length, `is_instrumental`, lyric improvisation, and Replicate invocation assumptions. Do not invent undocumented MusicGen behavior.

- [ ] **Step 2: Update current documentation and tracking**

Describe ACE-Step as current `replicate-ace-step` implementation in README and ACE-Step documentation; link the legacy reference. Keep active PLAN item until result records are written.

- [ ] **Step 3: Run boundary and quality checks**

Run `rg -n "ACE_STEP|buildAceStepInput|fishaudio/ace-step|replicate\\.predictions" app/api/music lib/music.ts lib/reconcile-music.ts lib/refineStylePrompt.ts lib/cost-logging.ts`, then `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

Expected: music generation specifics only reside in the initial provider adapter; thumbnail-specific Replicate references remain allowed. All quality gates pass.

- [ ] **Step 4: Write completion records and commit**

Archive current `RESULT.md` at the top of `RESULT_ARCHIVE.md`, write new `RESULT.md` with Background, Implementation, Verification Matrix, and Lessons, move active PLAN item to Done, then commit documentation/result records.
