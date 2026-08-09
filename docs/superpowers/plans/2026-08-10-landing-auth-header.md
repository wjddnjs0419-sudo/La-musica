# Landing Auth Header Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Prevent the landing header from offering Sign in to authenticated users.

**Architecture:** A pure action resolver defines the allowed header actions for loading, anonymous, and authenticated states. A shared client hook reads the existing `/api/auth/status` endpoint once, and Header/Hero/CTA consume the same result without changing OAuth endpoints or session handling.

**Tech Stack:** React 19, TypeScript, Vitest, existing `/api/auth/status` route.

## Global Constraints

- Do not change OAuth routes, cookies, proxy, session refresh, or `/api/auth/status` response format.
- Anonymous users see Sign in and Create; authenticated users see Workspace and Create; loading state hides auth-specific actions.
- Authenticated Workspace href is `/workspace`; authenticated Create href is `/workspace?create=1`.

---

### Task 1: Header action state contract

**Files:**
- Create: `lib/landing-auth.ts`
- Create: `lib/landing-auth.test.ts`

**Interfaces:**
- Produces: `resolveLandingHeaderActions(status)` for `"loading" | "anonymous" | "authenticated"`.

- [ ] Write Vitest cases for the three action states, confirm they fail because the resolver does not exist, then implement the resolver and confirm they pass.

### Task 2: Shared status consumer and header rendering

**Files:**
- Modify: `components/auth-aware-get-started-badge.tsx`
- Modify: `components/headersection.tsx`

**Interfaces:**
- Consumes: unchanged `/api/auth/status` JSON and `resolveLandingHeaderActions`.
- Produces: no Sign in trigger for authenticated users; existing Create behavior remains.

- [ ] Reuse one cached status request in a shared hook and branch header actions according to the resolver.

### Task 3: Verification

- [ ] Run `npm test -- lib/landing-auth.test.ts`, `npm run build`, `npm run lint`, and `git diff --check`.
