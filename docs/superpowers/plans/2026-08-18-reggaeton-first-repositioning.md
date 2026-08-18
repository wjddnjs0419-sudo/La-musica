# Reggaeton-First Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Reggaeton-first creation experience while preserving the existing generation lifecycle.

**Architecture:** Add a typed Reggaeton domain contract to the shared prompt compiler. The Sound form and generate route consume it: the client sends Style and Scene while the server forces `genre: "reggaeton"`. Existing rows and ACE-Step job recovery remain untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Replicate Google Lyria 3 Pro, InsForge.

**Spec:** `docs/superpowers/specs/2026-08-18-reggaeton-first-repositioning-design.md`

## Global Constraints

- Every new request compiles with `genre: "reggaeton"`, irrespective of its client payload.
- Do not change Step 1 Lyrics, Step 3 credits, reservation/refund, storage, polling, reconciliation, or legacy ACE-Step support.
- Retain `google/lyria-3-pro`; no provider migration or pricing change is in scope.
- Do not expose BPM or model-specific prompt syntax.
- Use the first supplied nightclub image for Hero and second for CTA.
- Finish with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/music-prompt/types.ts` | Style/Scene and compiled metadata types. |
| `lib/music-prompt/reggaeton.ts` | Allowlists, presets, prompt guidance, language defaults, preset matching. |
| `lib/music-prompt/buildMusicPrompt.ts` | Style/Scene prompt integration. |
| `lib/workspace/create-song.ts` | Reggaeton form state, validation, request serialization. |
| `components/workspace/CreateSongModal.tsx` | Simple/Advanced controls and state synchronization. |
| `app/api/music/generate/route.ts` | Genre enforcement and resolved auto-lyrics language. |
| `components/herosection.tsx`, `components/cta-section.tsx`, `app/page.tsx` | Assets, approved copy, overlays, and SEO. |

### Task 1: Reggaeton prompt contract

**Files:** Create `lib/music-prompt/reggaeton.ts`, `lib/music-prompt/reggaeton.test.ts`; modify `types.ts`, `presets.ts`, `buildMusicPrompt.ts`, `buildMusicPrompt.test.ts`, and `index.ts` in `lib/music-prompt`.

**Interfaces:** Produce `ReggaetonStyle`, `ReggaetonScene`, `ReggaetonSimplePreset`, `REGGAETON_SIMPLE_PRESETS`, `isReggaetonStyle`, `isReggaetonScene`, `resolveReggaetonLanguage`, and `getMatchingReggaetonSimplePreset`. Extend compiler input and metadata with optional `style` and `scene`.

- [ ] **Step 1: Write the failing contract tests.** Assert `resolveReggaetonLanguage("", false) === "Spanish"`, `resolveReggaetonLanguage("", true) === undefined`, preset `perreo/sexy/club` matches `club_heat`, and mismatched values return `""`.
- [ ] **Step 2: Verify failure.** Run `npx vitest run lib/music-prompt/reggaeton.test.ts`; expected failure: module or exports are absent.
- [ ] **Step 3: Implement the contract.** Define styles `old_school`, `reggaeton_pop`, `perreo`, `romantic`, `trapeton`, `neoperreo`; scenes `club`, `late_night`, `beach`, `party`; exact Simple mappings Club Heat→Perreo/Sexy/Club, After Midnight→Trapetón/Dark/Late Night, Dangerous Love→Romantic/Dark/Late Night, Summer Nights→Reggaeton Pop/Energetic/Beach. Add their guidance/helper text, six valid Reggaeton moods, and four Scene guidance strings.
- [ ] **Step 4: Integrate and test compiler output.** Append valid Style/Scene guidance after base Reggaeton guidance; metadata retains only valid values. Test a Perreo/Sexy/Club Spanish female-vocal song has `genre`, `style`, and `scene` metadata, contains `sung in Spanish`, preserves copyright guidance. Run `npx vitest run lib/music-prompt/reggaeton.test.ts lib/music-prompt/buildMusicPrompt.test.ts lib/music-prompt/presets.test.ts`; expected PASS.
- [ ] **Step 5: Commit.** Run `git add lib/music-prompt && git commit -m "feat(prompt): add reggaeton sound contract"`.

### Task 2: Workspace form contract

**Files:** Modify `lib/music.ts`, `lib/workspace/create-song.ts`, and `lib/workspace/create-song.test.ts`.

**Interfaces:** Consume Task 1 types. Produce `CreateSongFormState.style`, `.scene`, `.simplePreset`, `canContinueFromSound(form, mode)`, and a request with `genre: "reggaeton"`, `style`, and `scene`.

- [ ] **Step 1: Write failing tests.** Check blank Simple description plus no preset is false; blank description plus `club_heat` is true; a Perreo/Club form serializes `{ genre: "reggaeton", style: "perreo", scene: "club" }`.
- [ ] **Step 2: Verify failure.** Run `npx vitest run lib/workspace/create-song.test.ts`; expected failure: fields/helper absent.
- [ ] **Step 3: Implement state and serialization.** Remove editable Genre, Use case, and generic presets. Add Style, Mood, Scene, Language and Vocal constants. Make Mood unrestricted multi-select. Add `style`, `scene`, `simplePreset` to form state. Join description and optional sound direction with `. ` and serialize the fixed genre.
- [ ] **Step 4: Verify pass.** Run `npx vitest run lib/workspace/create-song.test.ts`; expected PASS for trim, description append, Reggaeton serialization, and Simple validation.
- [ ] **Step 5: Commit.** Run `git add lib/music.ts lib/workspace/create-song.ts lib/workspace/create-song.test.ts && git commit -m "feat(workspace): model reggaeton sound settings"`.

### Task 3: Sound-step UI and mode synchronization

**Files:** Modify `components/workspace/CreateSongModal.tsx`.

**Interfaces:** Consume Task 1 mappings and Task 2 state. Keep all existing modal callbacks and submit the new request shape.

- [ ] **Step 1: Implement synchronized updates.** `applyPreset` applies `REGGAETON_SIMPLE_PRESETS[preset]`; each Advanced update recomputes `simplePreset` with `getMatchingReggaetonSimplePreset(next.style, next.moods, next.scene)`.
- [ ] **Step 2: Implement Simple.** Render Club Heat, After Midnight, Dangerous Love, Summer Nights and optional description with `Smooth late-night reggaeton with a catchy hook`. Base footer disablement on `canContinueFromSound(form, soundMode)`.
- [ ] **Step 3: Implement Advanced.** Render optional single Style with desktop-hover and mobile-selected helper text, all six Mood chips, existing Auto/Instrumental/Male/Female/Rap Vocal choices, unchanged Duration, Auto/Spanish/Spanglish/English/Portuguese Language, optional single Scene, and free text with `Heavy bass, hypnotic chorus, minimal percussion`. Remove Genre, Use case, advanced presets, and nested disclosure.
- [ ] **Step 4: Manually QA.** Run `npm run lint -- components/workspace/CreateSongModal.tsx`; expected no new errors. Confirm Club Heat maps to Perreo/Sexy/Club in Advanced, an Advanced change clears it, lyrics still reach the assistant, blank Simple cannot continue, and text-only Simple can.
- [ ] **Step 5: Commit.** Run `git add components/workspace/CreateSongModal.tsx && git commit -m "feat(workspace): redesign reggaeton sound step"`.

### Task 4: Server contract and language logic

**Files:** Create `lib/music-prompt/reggaeton-request.ts`, `lib/music-prompt/reggaeton-request.test.ts`; modify `app/api/music/generate/route.ts`, `lib/lyrics-assistant/prompt.ts`, and `lib/lyrics-assistant/generateAutoLyrics.test.ts`.

**Interfaces:** Consume Task 1 validators and resolver. Produce `resolveReggaetonGenerationInput` so the route passes forced genre, valid Style/Scene, and resolved language to compile and auto-lyrics.

- [ ] **Step 1: Write failing tests.** For `{ genre: "edm", language: "", lyrics: "", style: "perreo", scene: "club" }`, expect normalized `{ genre: "reggaeton", language: "Spanish", style: "perreo", scene: "club" }`. Assert Spanglish reaches the lyric context.
- [ ] **Step 2: Verify failure.** Run `npx vitest run lib/music-prompt/reggaeton-request.test.ts lib/lyrics-assistant/generateAutoLyrics.test.ts`; expected failure: helper absent.
- [ ] **Step 3: Normalize before current orchestration.** Parse `style` and `scene`, discard unknown values, force genre, and resolve Auto to Spanish only when user lyrics are blank. Use the resolved value for compiler and automatic lyrics. In lyric instructions, define Spanglish as a natural Spanish/English mix; never rewrite direct lyrics.
- [ ] **Step 4: Verify regressions.** Run `npx vitest run lib/music-prompt/reggaeton-request.test.ts lib/lyrics-assistant/generateAutoLyrics.test.ts lib/music-prompt/buildMusicPrompt.test.ts lib/music-generation/providers/replicate-google-lyria-3-pro.test.ts`; expected PASS with unchanged Lyria model ID/input shape.
- [ ] **Step 5: Commit.** Run `git add app/api/music/generate/route.ts lib/music-prompt lib/lyrics-assistant && git commit -m "feat(generate): enforce reggaeton requests"`.

### Task 5: Landing assets, copy, and responsive treatment

**Files:** Create `public/images/reggaeton-hero-club.jpg` from the first user-supplied image and `public/images/reggaeton-cta-club.jpg` from the second; modify `components/herosection.tsx`, `components/cta-section.tsx`, `components/how-it-works-section.tsx`, `components/product-feature-section.tsx`, and `app/page.tsx`.

**Interfaces:** Consume the two local public assets. Preserve existing auth-aware CTA behavior.

- [ ] **Step 1: Add the binary assets.** Preserve supplied source images without added logos or text at the deterministic paths above.
- [ ] **Step 2: Apply exact Hero and CTA content.** Hero: `LA MUSICA`; `What if the club played your song tonight?`; `Create your own reggaeton track with AI — your vibe, your lyrics, your sound.`; `Create Your Track`. Use the first image and CSS gradient `linear-gradient(90deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.48) 38%,rgba(0,0,0,.15) 65%,rgba(0,0,0,.05) 100%)`, preserving the right preview. CTA uses second image with centered vignette, `Don’t just dance to it. Make it.`, `Create your own reggaeton track with La Musica.`, and `Create Your Track`.
- [ ] **Step 3: Align supporting copy.** Change How It Works and control mockup from Genre/Use case to Reggaeton Style/Mood/Scene. Update homepage title, description, and WebApplication JSON-LD to accurate Reggaeton-first wording, without superiority or unvalidated claims.
- [ ] **Step 4: Verify responsive behavior.** Run `npm run lint -- components/herosection.tsx components/cta-section.tsx components/how-it-works-section.tsx components/product-feature-section.tsx app/page.tsx`; expected no new errors. At 375px, 768px, 1440px confirm readable Hero/CTA copy, clean H1 wrapping, no preview collision, and working CTA actions.
- [ ] **Step 5: Commit.** Run `git add public/images/reggaeton-hero-club.jpg public/images/reggaeton-cta-club.jpg components/herosection.tsx components/cta-section.tsx components/how-it-works-section.tsx components/product-feature-section.tsx app/page.tsx && git commit -m "feat(landing): position la musica for reggaeton"`.

### Task 6: Full verification and records

**Files:** Modify `PLAN.md`, `RESULT.md`, `RESULT_ARCHIVE.md`.

**Interfaces:** Consumes every prior task and produces the required completion records.

- [ ] **Step 1: Run automated gate.** Run `npm test && npm run lint && npm run build && git diff --check`; expected tests/build pass, no new lint errors, and clean diff.
- [ ] **Step 2: Smoke-test lifecycle.** With a disposable authenticated credit, create one Simple preset and Advanced Spanglish song. Verify each row has `metadata.genre === "reggaeton"`, valid Style/Scene metadata, Lyria provider/job data, and the current completion or failed-refund behavior. Never replay legacy tracks.
- [ ] **Step 3: Update records.** Archive current `RESULT.md` to the top of `RESULT_ARCHIVE.md`; create a current result with Background, Implementation, Verification Matrix, Lessons; move this item to a concise `[Done]` line in `PLAN.md` and retain at most ten Done items.
- [ ] **Step 4: Commit.** Run `git add PLAN.md RESULT.md RESULT_ARCHIVE.md && git commit -m "docs: record reggaeton repositioning verification"`.

## Self-Review

- Spec coverage: Tasks 1–4 cover contract, Simple/Advanced, language, metadata, Lyria continuity, and lifecycle boundaries. Task 5 covers Hero/CTA, copy, assets, and responsive QA. Task 6 covers validation and records.
- Placeholder scan: every new function/field is named with its producing task and each task has explicit tests or manual checks.
- Type consistency: `ReggaetonStyle`, `ReggaetonScene`, `style`, `scene`, `simplePreset`, and `resolveReggaetonLanguage` are consistent throughout.
