# Auth Modal Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Replace the user-facing La Musica authentication page with a minimal modal that preserves the action a visitor intended to take across Google OAuth.

**Architecture:** A client-side auth modal provider owns modal visibility and a typed post-login intent. Landing buttons request the provider instead of navigating to `/auth`; the OAuth start route serializes only safe local destinations and intent into short-lived cookies, and the callback restores them. The workspace consumes the `create=1` intent after bootstrap to open its existing composer UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, `@insforge/sdk/ssr` OAuth.

## Global Constraints

- Keep the existing Google OAuth, session cookie exchange, free-credit grant, and legal pages.
- Do not add email/password, Apple login, or backend identity-provider changes.
- Keep modal surface near-black (`#050505`), white-alpha border, warm-white text, muted secondary copy, and no gradients or glass treatment.
- Modal is centered at 440–520px on desktop, dismissible by X, backdrop, and Escape.
- Validate redirects against same-origin paths only; default sign-in destination is `/workspace`.
- Run `npm run build` and `npm run lint` after implementation.

---

### Task 1: Modal provider and reusable auth trigger

**Files:**
- Create: `components/auth-modal.tsx`
- Create: `components/auth-context.tsx`
- Modify: `app/page.tsx`
- Modify: `components/auth-aware-get-started-badge.tsx`
- Modify: `components/get-started-badge.tsx`
- Modify: `components/headersection.tsx`
- Modify: `components/herosection.tsx`
- Modify: `components/cta-section.tsx`

**Interfaces:**
- Produces `AuthProvider` and `useAuthModal()` with `openAuth({ returnTo, intent })` and `closeAuth()`.
- `AuthModal` posts `returnTo` and `intent` to `/api/auth/google` while retaining Terms and Privacy links.
- `AuthAwareGetStartedBadge` opens `{ returnTo: "/workspace?create=1", intent: "create" }` for logged-out users and links logged-in users to that workspace URL.

- [ ] **Step 1: Implement the provider and modal**

```tsx
type AuthIntent = "signin" | "create";
type AuthRequest = { returnTo?: string; intent?: AuthIntent };

const { openAuth, closeAuth } = useAuthModal();
// openAuth({ returnTo: "/workspace?create=1", intent: "create" });
```

Render a fixed, `z-[100]` backdrop using `bg-black/65 backdrop-blur-sm`; render the dialog at `max-w-[500px]`, `bg-[#0a0a0a]`, a subtle white-alpha border, an X button, the monochrome horizontal logo, the exact line “Your ideas deserve a soundtrack.”, one high-contrast white “Continue with Google” submit button with the existing official Google SVG, and legal links. Use an Escape listener only while open and close on a backdrop pointer event whose target is the backdrop.

- [ ] **Step 2: Wire landing actions to the provider**

```tsx
const requestAuth = () => openAuth({ returnTo: "/workspace", intent: "signin" });
const requestCreate = () => openAuth({ returnTo: "/workspace?create=1", intent: "create" });
```

Wrap landing content in `AuthProvider`; replace `/auth` links and badge href state with click handlers. The header Sign in invokes `requestAuth`; header Create, hero CTA, and final CTA invoke `requestCreate`. Preserve current logged-in link behavior.

- [ ] **Step 3: Verify modal behavior manually**

Run: `npm run dev`

Expected: all logged-out landing authentication entry points open the same modal; X, backdrop, and Escape close it; legal links are usable; no `/auth` navigation occurs.

### Task 2: OAuth return-state preservation and legacy route compatibility

**Files:**
- Create: `lib/auth-return.ts`
- Modify: `app/api/auth/google/route.ts`
- Modify: `app/api/auth/callback/route.ts`
- Modify: `app/auth/page.tsx`
- Modify: `app/api/auth/signout/route.ts`

**Interfaces:**
- Produces `sanitizeAuthReturnPath(value: string | null): string` and `authErrorRedirect(request, error): NextResponse`.
- `/api/auth/google` receives form fields `returnTo` and `intent`, saves safe state in an httpOnly 10-minute cookie, and starts unchanged Google OAuth.
- Callback restores the saved safe return path after setting existing session cookies.

- [ ] **Step 1: Add deterministic redirect helpers and unit tests**

```ts
expect(sanitizeAuthReturnPath("/workspace?create=1")).toBe("/workspace?create=1");
expect(sanitizeAuthReturnPath("https://attacker.example")).toBe("/workspace");
expect(sanitizeAuthReturnPath("//attacker.example")).toBe("/workspace");
```

Accept only strings beginning with one `/` but not `//`; use `/workspace` for missing or unsafe paths. Create an error redirect URL of `/?auth=1&error=<code>` so errors reopen the modal on the landing page rather than render a full auth page.

- [ ] **Step 2: Persist and restore OAuth state**

```ts
const form = await request.formData();
const returnTo = sanitizeAuthReturnPath(form.get("returnTo")?.toString() ?? null);
response.cookies.set("la_musica_auth_return", returnTo, { httpOnly: true, maxAge: 600, sameSite: "lax", path: "/" });
```

Keep `insforge_code_verifier`, Google provider configuration, exchange, auth-cookie setting, and free-credit grant unchanged. On every callback terminal path clear only the return cookie when appropriate; success redirects to its saved return path and deletes both temporary cookies. Change sign-out to redirect to `/?auth=1` only if a later explicit sign-in is desired; otherwise redirect home without opening a modal.

- [ ] **Step 3: Turn `/auth` into a compatibility redirect**

```tsx
redirect("/?auth=1");
```

Preserve an incoming error code as `/?auth=1&error=<code>` and redirect already-authenticated legacy requests to `/workspace`. This retains existing old links without showing a dedicated auth UI.

- [ ] **Step 4: Run focused redirect tests**

Run: `npm test -- lib/auth-return.test.ts`

Expected: safe local return paths are retained and external/protocol-relative paths fall back to `/workspace`.

### Task 3: Workspace create intent and protected-action fallback

**Files:**
- Modify: `components/workspace/WorkspaceShell.tsx`
- Modify: `components/workspace/MusicComposer.tsx`
- Modify: `components/pricing-section.tsx`

**Interfaces:**
- `MusicComposer` accepts `autoFocus?: boolean` and forwards it to the prompt input’s existing focus/open mechanism or exposes an `onReady` callback if the input lacks one.
- Workspace checks `create=1` after successful bootstrap and opens/focuses the composer once, then removes the query state with `history.replaceState`.
- Pricing’s 401 path opens `AuthModal` with `returnTo: "/#pricing"` rather than assigning `/auth`.

- [ ] **Step 1: Restore the create intent after a successful workspace bootstrap**

```tsx
if (new URLSearchParams(window.location.search).get("create") === "1") {
  setCreateRequested(true);
  window.history.replaceState({}, "", "/workspace");
}
```

Do not run this on failed or unauthenticated bootstrap. Make the existing prompt composer visibly ready and focusable immediately after loading, without starting generation or changing music-generation API behavior.

- [ ] **Step 2: Replace remaining interactive `/auth` handoffs**

```tsx
if (response.status === 401) {
  openAuth({ returnTo: "/#pricing", intent: "signin" });
  return;
}
```

For workspace bootstrap 401, navigate to `/?auth=1&returnTo=/workspace` because the workspace cannot display its loaded app shell without authentication; it lands on the home page and opens the modal. Keep non-auth errors unchanged.

- [ ] **Step 3: Verify intent flows manually**

Run: `npm run dev`

Expected: Hero and final CTA login return to workspace with its composer ready; header Sign in returns to workspace without create intent; unauthenticated checkout opens the same landing modal and returns to pricing; direct `/auth` shows no separate page.

### Task 4: Production validation and project records

**Files:**
- Modify: `PLAN.md`
- Modify: `RESULT.md`
- Modify: `RESULT_ARCHIVE.md` (only if an existing RESULT must be archived)

**Interfaces:**
- Produces a completed workflow record with an implementation summary and verification matrix.

- [ ] **Step 1: Run static validation**

Run: `npm run build && npm run lint`

Expected: production build succeeds and lint has no new errors.

- [ ] **Step 2: Record completion**

Move the in-progress PLAN entry to Done, archive the existing `RESULT.md` at the top of `RESULT_ARCHIVE.md`, and replace `RESULT.md` with the modal-auth background, implementation, verification matrix, and lessons.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intentional authentication-modal files changed.
