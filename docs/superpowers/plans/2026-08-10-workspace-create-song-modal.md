# Workspace Create Song Modal Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** 기존 `/workspace`에 실제 생성 로직을 보존하는 반응형 3단계 Create Song 모달과 생성 진행·완료 경험을 구현한다.

**Architecture:** `WorkspaceShell`은 tracks, credits, polling, audio의 소유자로 유지하고, 새 `CreateSongModal`은 편집 UI와 단계 이동만 담당한다. 모달은 완성된 `GenerateRequest`를 Shell로 올리고, Shell은 실제 API·optimistic track·폴링 결과를 다시 모달의 generating/ready/failed 상태에 공급한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest.

## Global Constraints

- 새 라우트나 `workspace_renew` 런타임 의존성을 추가하지 않는다.
- 모든 곡, 잔액, 생성 상태, 재생 상태는 기존 서비스의 `Music`, `remainingCredit`, API, audio element를 사용한다.
- Desktop은 좌측 세로 단계, mobile은 상단 좌→우 가로 단계를 사용하며 기능을 축소하지 않는다.
- `POST /api/music/generate` 요청은 Create 클릭에서 한 번만 발생하며, 생성 중 모달을 닫아도 폴링은 계속된다.
- 완료 곡은 사용자가 Listen now를 클릭할 때만 재생한다.
- 변경 후 `npm test -- lib/workspace/create-song.test.ts`, `npm run build`, `npm run lint`를 실행한다.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `lib/workspace/create-song.ts` | 모달 폼 상태를 `GenerateRequest`로 변환하고 mood 선택 제한을 적용하는 순수 함수 |
| Create | `lib/workspace/create-song.test.ts` | 요청 변환·mood 제한·instrumental 가사 보존 단위 테스트 |
| Create | `components/workspace/CreateSongModal.tsx` | 3단계 반응형 편집 UI 및 generating/ready/failed 표현 |
| Create | `public/videos/workspace-generation.mp4` | 기존 프로토타입의 루프형 생성 배경 영상 |
| Modify | `components/workspace/MusicComposer.tsx` | 기존 하단 입력기를 모달 열기 진입점으로 전환 |
| Modify | `components/workspace/WorkspaceShell.tsx` | 모달 상태, 실제 생성 요청·완료·실패·명시적 재생 연결 |
| Delete | `components/generation/GenerationFailureDialog.tsx` | 실패 UI를 CreateSongModal로 흡수한 뒤 미사용 컴포넌트 제거 |
| Modify | `tsconfig.json` | 독립 Vite 프로토타입이 Next.js 서비스 타입 검사에 포함되지 않도록 제외 |
| Modify | `eslint.config.mjs` | 독립 Vite 프로토타입이 Next.js 서비스 lint 범위에 포함되지 않도록 제외 |

### Task 1: Create-song form state and request mapping

**Files:**
- Create: `lib/workspace/create-song.ts`
- Test: `lib/workspace/create-song.test.ts`

**Interfaces:**
- Produces: `CreateSongFormState`, `CREATE_SONG_INITIAL_STATE`, `buildCreateSongRequest(state)`, `toggleMoodSelection(current, mood)`.
- Consumes: `GenerateRequest`, `MusicMood` and `VocalMode` from existing music types.

- [ ] **Step 1: Write failing tests for request construction and the three-mood limit**

```ts
import { describe, expect, it } from "vitest";
import {
  buildCreateSongRequest,
  toggleMoodSelection,
} from "./create-song";

it("keeps written lyrics when instrumental is selected", () => {
  expect(buildCreateSongRequest({ ...state, lyrics: "Keep me", vocalMode: "instrumental" })).toMatchObject({
    lyrics: "Keep me",
    instrumental: true,
  });
});

it("does not add a fourth mood", () => {
  expect(toggleMoodSelection(["hard", "dark", "epic"], "happy")).toEqual(["hard", "dark", "epic"]);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the module does not exist**

Run: `npm test -- lib/workspace/create-song.test.ts`

Expected: FAIL with module-not-found error.

- [ ] **Step 3: Implement the form state and pure helpers**

```ts
export function buildCreateSongRequest(state: CreateSongFormState): GenerateRequest {
  return {
    prompt: state.prompt.trim(),
    lyrics: state.lyrics.trim() || undefined,
    instrumental: state.vocalMode === "instrumental",
    genre: state.genre || undefined,
    moods: state.moods.length ? state.moods : undefined,
    useCase: state.useCase || undefined,
    vocalMode: state.vocalMode,
    language: state.language || undefined,
    duration: state.duration,
  };
}
```

- [ ] **Step 4: Run the focused test and confirm request mapping passes**

Run: `npm test -- lib/workspace/create-song.test.ts`

Expected: PASS.

### Task 2: Build the responsive 3-step modal

**Files:**
- Create: `components/workspace/CreateSongModal.tsx`
- Create: `public/videos/workspace-generation.mp4`

**Interfaces:**
- Consumes: `CreateSongFormState`, `GenerationPhase`, `Music | null`, `remainingCredits`, `generationStartMs`.
- Produces: `onSubmit(payload: GenerateRequest)`, `onClose()`, `onOpenCreditModal()`, `onListenNow(music)` callbacks.

- [ ] **Step 1: Add the existing prototype video as a static public asset**

Copy `workspace_renew/src/imports/Loading_video.mp4` to `public/videos/workspace-generation.mp4` without modifying its contents. Reference it only as `/videos/workspace-generation.mp4` from the modal.

- [ ] **Step 2: Create modal props and desktop/mobile step navigation**

```tsx
type CreateSongModalProps = {
  open: boolean;
  phase: GenerationPhase;
  readyMusic: Music | null;
  remainingCredits: number;
  generationStartMs: number;
  onSubmit: (payload: GenerateRequest) => void;
  onClose: () => void;
  onOpenCreditModal: () => void;
  onListenNow: (music: Music) => void;
};
```

Render an `aria-modal` dialog. Use `hidden md:flex` for the desktop left navigation and `flex md:hidden` for the mobile horizontal navigation; both render the same three numbered buttons.

- [ ] **Step 3: Implement Lyrics and Sound steps from the existing option set**

Use the exact existing options from `prompt-box.tsx`: `GENRE_OPTIONS`, `MOOD_OPTIONS`, `VOCAL_OPTIONS`, `LANGUAGE_OPTIONS`, `USE_CASE_OPTIONS`, and `PRESETS`. Move these shared constants into `lib/workspace/create-song.ts` if necessary so no option list is duplicated. The Sound step must use chips for genre/mood, segmented buttons for vocal/duration, and a collapsible Advanced settings section.

- [ ] **Step 4: Implement the Create credit confirmation step**

Use `generationCost = 1`, matching the current server deduction. When `remainingCredits < generationCost`, show “Get credits” and call `onOpenCreditModal`; otherwise call `onSubmit(buildCreateSongRequest(formState))`. Disable Continue until the trimmed prompt is non-empty.

- [ ] **Step 5: Implement generating, ready, and failed modal states**

Use `calcGenerationProgress(Date.now() - generationStartMs)` for estimated progress and `<video autoPlay loop muted playsInline>` for the background. Generating exposes only “Back to My music”, which calls `onClose`. Ready uses `MusicThumbnail`, actual title and duration, and invokes `onListenNow(readyMusic)` without autoplay. Failed shows the existing refund copy and exposes Try again, Edit prompt, Back; all return to the editable Create step without sending a request.

- [ ] **Step 6: Manually verify the modal layout at 390px and 1440px**

Run: `npm run dev`

Expected: 390px has horizontal left-to-right steps; 1440px has a left vertical navigation; all fields remain reachable in both layouts.

### Task 3: Wire the modal into real workspace generation state

**Files:**
- Modify: `components/workspace/MusicComposer.tsx`
- Modify: `components/workspace/WorkspaceShell.tsx`

**Interfaces:**
- Consumes: `CreateSongModal.onSubmit(payload)`, existing `handleSend(payload)`, existing `genPhase` and polling callback.
- Produces: one real generate request per Create action; `readyMusic` retained until the user closes/listens.

- [ ] **Step 1: Turn MusicComposer into an accessible modal-launch surface**

Replace the direct `PromptBox` submit UI with a button labelled “Create song” and supporting copy “Describe your music, lyrics, and sound.” Its props become `disabled: boolean` and `onOpen: () => void`; it does not own request state or call the API.

- [ ] **Step 2: Add modal visibility and ready-music state to WorkspaceShell**

```ts
const [createModalOpen, setCreateModalOpen] = React.useState(false);
const [readyMusic, setReadyMusic] = React.useState<Music | null>(null);
```

The existing `?create=1` effect opens `createModalOpen`. Remove the old `createComposerOpen` overlay and its textarea focus ref.

- [ ] **Step 3: Change the existing generation completion callback to preserve the ready result**

When the polled music with `genMusicIdRef.current` becomes completed, set `readyMusic` and `genPhase("success")`; do not call `loadAndPlayTrack`. Keep the modal open through success. On failed, preserve `genRefundStatus` and set `genPhase("failed")`.

- [ ] **Step 4: Route CreateSongModal submit through the existing handleSend flow**

Before calling `handleSend`, set `createModalOpen(true)`, clear `readyMusic`, and set phase to generating only after the request begins. Retain the existing optimistic track insert, credit update, API error mapping, and `poll(json.music.id)` behavior. When an initial request error occurs, return to the relevant edit step and display the existing error text instead of leaving a stale loading UI.

- [ ] **Step 5: Connect explicit Listen now and close behavior**

`onListenNow` calls `loadAndPlayTrack(music)`, closes the modal, clears `readyMusic`, and leaves `genPhase` idle. `onClose` hides the modal but does not clear `genMusicIdRef` or cancel polling while phase is generating. Reopening while a generation is active renders its generating state.

- [ ] **Step 6: Remove obsolete direct-generation UI and verify one request path remains**

Run: `rg -n "<PromptBox|onSend=|createComposerOpen" components/workspace components/workspace-shell.tsx`

Expected: no direct Workspace `PromptBox` submission and no stale `createComposerOpen` state; only `CreateSongModal` invokes `handleSend`.

### Task 4: Verify behavior and clean obsolete failure presentation

**Files:**
- Modify: `components/workspace/WorkspaceShell.tsx`
- Delete: `components/generation/GenerationFailureDialog.tsx`
- Modify: `tsconfig.json`
- Modify: `eslint.config.mjs`

**Interfaces:**
- Consumes: modal failure state and existing `RefundStatus`.
- Produces: exactly one visible failure experience for the active generation.

- [ ] **Step 1: Remove the standalone failure dialog render after its copy is owned by CreateSongModal**

Delete the `GenerationFailureDialog` import and JSX render from `WorkspaceShell`. Keep or delete the file only after `rg -n "GenerationFailureDialog" . --glob '!node_modules/**'` confirms whether another caller exists.

- [ ] **Step 2: Run focused unit tests**

Run: `npm test -- lib/workspace/create-song.test.ts`

Expected: PASS.

- [ ] **Step 3: Exclude the independent Vite prototype from the Next.js TypeScript program**

Add `"workspace_renew"` to the root `tsconfig.json` `exclude` array and `"workspace_renew/**"` to `eslint.config.mjs` global ignores. The root service patterns are intentionally broad; the prototype has its own `workspace_renew/tsconfig.json` and dependencies, so it must not be type-checked or linted by service gates.

- [ ] **Step 4: Run production type/build validation**

Run: `npm run build`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Run lint validation**

Run: `npm run lint`

Expected: no newly introduced lint errors.

- [ ] **Step 6: Perform manual integration verification**

Verify in `/workspace`:

1. Mobile uses horizontal `Lyrics → Sound → Create` navigation and desktop uses a left vertical navigation.
2. Fourth mood cannot be selected; Instrumental leaves written lyrics untouched.
3. Insufficient credit opens CreditModal and sends no request.
4. Create makes one request, closing during progress leaves the optimistic row and polling active.
5. Completion does not autoplay; Listen now begins playback of the completed track.
6. Failed generation displays correct refund wording and returns to the editable modal without sending another request.

- [ ] **Step 7: Record completion and commit implementation**

Update `PLAN.md`, archive the previous `RESULT.md` into `RESULT_ARCHIVE.md`, write the verification matrix to the new `RESULT.md`, then run:

```bash
git add PLAN.md RESULT.md RESULT_ARCHIVE.md lib/workspace components/workspace components/generation public/videos
git commit -m "feat(workspace): add create song modal flow"
```

## Self-Review

- Spec coverage: Tasks 1–3 cover shared real-data state, all three editable steps, desktop/mobile navigation, generation progress, ready flow, and credit handling. Task 4 covers failure, validations, and project documentation.
- Placeholder scan: no deferred requirements or unspecified file boundaries remain.
- Type consistency: `CreateSongFormState` produces `GenerateRequest`; `CreateSongModal` emits that request to the existing `WorkspaceShell.handleSend`; polling returns `Music` to the modal as `readyMusic`.
