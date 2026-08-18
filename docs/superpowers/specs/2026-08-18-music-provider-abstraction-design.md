# Music Provider Abstraction — Design

Date: 2026-08-18

## Problem

The application now generates music with ACE-Step 1.5, but the music lifecycle
is coupled directly to Replicate and ACE-Step in three application routes:

- `app/api/music/generate/route.ts` creates a Replicate prediction with the
  ACE-Step version hash and input shape.
- `app/api/music/[id]/route.ts` polls Replicate, interprets its prediction
  status and output, then persists the audio.
- `app/api/internal/reconcile-music/route.ts` repeats that polling work for
  jobs left unfinished after the browser stops polling.

This makes a future provider or model change a cross-cutting route rewrite.
It also leaves the previous MiniMax/MusicGen prompt-tuning rationale scattered
across historical specifications, plans, result notes, and comments rather
than available as one deliberate reference.

## Goals

1. Make music generation provider-independent at the application boundary.
2. Keep current ACE-Step generation behavior, API responses, credits, polling,
   storage persistence, and recovery behavior unchanged.
3. Keep historical in-progress Replicate jobs recoverable.
4. Preserve MiniMax/MusicGen tuning knowledge in a clearly marked legacy
   reference without treating it as current product behavior.
5. Avoid assuming capabilities of the not-yet-selected next music model.

## Non-goals

- Selecting, integrating, or benchmarking the next music provider or model.
- Changing the client API, workspace polling cadence, data ownership, RLS,
  audio-storage bucket, or credit policy.
- Abstracting thumbnails: cover generation remains a Replicate-specific,
  separately-scoped subsystem in this change.
- Creating a generic multimodal job platform, webhook framework, or provider
  marketplace.

## Chosen approach

Introduce a narrow server-only music provider interface with one initial
implementation: `replicate-ace-step`. Application routes will depend on the
interface and a provider resolver instead of importing `replicate`, model IDs,
or ACE-Step input builders directly.

The interface models only the common lifecycle known to be required:

```ts
type MusicGenerationRequest = {
  prompt: string;
  lyrics?: string;
  instrumental: boolean;
  duration?: number;
};

type StartedMusicGeneration = {
  provider: string;
  jobId: string;
  model: string;
};

type MusicGenerationStatus =
  | { state: "pending" }
  | { state: "succeeded"; audioUrl: string }
  | { state: "failed"; error: string };

interface MusicGenerationProvider {
  readonly id: string;
  start(request: MusicGenerationRequest): Promise<StartedMusicGeneration>;
  getStatus(jobId: string): Promise<MusicGenerationStatus>;
}
```

The contract intentionally does not expose Replicate prediction objects,
version hashes, output arrays, or a provider-specific cancellation state.
Provider implementations normalize those details to the three lifecycle
states. A future provider may add internal capabilities without widening the
application boundary until a product requirement needs them.

## Architecture and data flow

```text
prompt / lyrics / options
  → translation + prompt compilation + optional lyrics generation
  → music provider resolver
  → active MusicGenerationProvider.start()
  → metadata.generation { provider, job_id, model }
  → client poll or reconciliation cron
  → provider resolver for persisted provider
  → MusicGenerationProvider.getStatus()
  → existing InsForge Storage persistence + DB completion/refund flow
```

### Provider modules

Create a focused `lib/music-generation/` boundary:

- `types.ts`: provider-neutral request, start result, and status types.
- `provider.ts`: resolver for the configured active provider and persisted
  provider IDs. It is server-only and rejects unknown IDs safely.
- `providers/replicate-ace-step.ts`: current ACE-Step version pin, input
  adaptation, Replicate prediction creation, status mapping, and output URL
  extraction.

The ACE-Step-only constants and input construction move out of the generic
`lib/music.ts` domain file and into this implementation. `lib/music.ts`
retains persistent music domain types and UI request types that are not tied to
any provider.

### Generation creation

`POST /api/music/generate` continues to reserve credit and insert the pending
music row before starting external generation. It gets the configured active
provider, calls `start`, and stores the returned provider identity, job ID, and
model in:

```ts
metadata.generation = {
  provider: "replicate-ace-step",
  job_id: "...",
  model: "fishaudio/ace-step-1.5",
}
```

The database `model` column is assigned from the provider start result so it
continues to be a readable record of the model that created a track. The route
does not know whether the provider uses a model name, a version hash, a REST
endpoint, or a hosted queue.

### Polling and reconciliation

Shared reconciliation logic reads a normalized generation reference and calls
the matching provider. It consumes `pending`, `succeeded(audioUrl)`, and
`failed(error)` only. Existing InsForge upload idempotency, DB completion guard,
refund RPC, and 15-minute timeout policy remain intact.

The per-track poll route and daily internal reconciliation cron both use this
same abstraction. A transient provider-client exception remains retriable; it
does not mark the track failed. A normalized failed status or timeout triggers
the existing refund-and-fail path.

## Backward compatibility

Existing completed and failed records are untouched.

For historical `processing` rows, the resolver derives a generation reference
from legacy `metadata.prediction_id` when `metadata.generation` is absent:

```ts
{
  provider: "replicate-ace-step",
  jobId: metadata.prediction_id,
  model: music.model ?? "fishaudio/ace-step-1.5",
}
```

This fallback is read-only; no bulk migration is necessary. New rows use only
`metadata.generation`. Once no legacy processing rows remain, a later cleanup
can remove compatibility code with evidence from the database.

## Legacy tuning reference

Create `docs/legacy/minimax-musicgen-tuning.md` as a historical, non-runtime
reference. It will consolidate only verified legacy behavior and clearly state
that it does not prescribe the current or next model's contract:

- MiniMax used long, dense English descriptor prompts (approximately 2,000
  characters) after translation, deterministic compilation, and optional
  Gemini refinement.
- Prompt compiler tuning: genre, mood, use-case, vocal-mode presets,
  de-duplication, ordering, and reference sanitization.
- MiniMax input assumptions: model-name invocation, `is_instrumental`,
  optional lyric payload, and model-side lyric improvisation for lyricless
  vocal prompts.
- MusicGen-era references, if any, are labelled as historical context rather
  than copied into an active adapter.
- What remains portable (user-intent normalization, structural presets,
  section-tagged lyrics) versus what was model-specific (input field names,
  prompt-length target, instrumental signaling, lyric behavior, output and
  duration assumptions).

Current ACE-Step product documentation remains current-model documentation;
the legacy reference prevents it from becoming the canonical record for
MiniMax/MusicGen decisions.

## Tests and verification

1. Unit-test the provider-neutral status and legacy reference extraction:
   modern `metadata.generation`, legacy `prediction_id`, malformed data, and
   unknown provider IDs.
2. Unit-test the Replicate ACE-Step adapter's request translation and status
   normalization, including array and scalar outputs, failed/canceled jobs, and
   missing output.
3. Refactor reconciliation unit tests to depend on the provider-neutral
   contract while retaining behavior coverage for pending, success, failure,
   timeout, idempotent audio storage, and missing job IDs.
4. Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| New abstraction changes a live ACE-Step request payload | Preserve the current version pin and input-builder behavior inside the first adapter; lock it with adapter tests. |
| Existing processing tracks cannot finish after deployment | Read legacy `metadata.prediction_id` as a Replicate ACE-Step generation reference. |
| Abstraction expands into a speculative job platform | Limit the interface to start/status/audio URL; defer callbacks, webhooks, cancellation, and thumbnails. |
| Legacy documentation is mistaken for current guidance | Place it under `docs/legacy`, use an explicit historical warning, and link to current model documentation separately. |
