# RESULT: Auth-aware landing CTA label - 2026-06-18

## Background
- Request: The landing page already sends signed-in users from `Get Started` to `/workspace`, but the wording feels unintuitive for returning users.
- Decision: Keep the anonymous/new-user CTA as `Get Started`, and show returning signed-in users `Open Workspace`.

## Implementation
- **`components/get-started-badge.tsx`**: added an optional `label` prop and changed the default label logic so `href="/workspace"` renders `Open Workspace`; all other/default CTAs keep `Get Started`.
- **Existing home flow reused**: `app/page.tsx` was already resolving `ctaHref` from the InsForge SSR session (`/workspace` for signed-in users, `/auth` otherwise), so no auth flow or route behavior changed.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Auth-aware CTA label | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- The routing was already auth-aware; the UX mismatch was purely copy. Making the shared badge infer the workspace label keeps Header, Hero, CTA section, and Footer consistent without threading extra props through every landing component.
