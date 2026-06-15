# RESULT: Landing mobile background consistency - 2026-06-16

## Background
- Request: mobile homepage background color looked different from the desktop/web homepage.
- The homepage was using a page-local `bg-slate-950` plus a warm top-right radial gradient.
- On narrow screens that warm gradient sat close to the hero copy and made the surface read warmer/gray compared with desktop.

## Implementation
- **`app/page.tsx`**: replaced the inline Tailwind homepage background utilities with landing-specific classes.
- **`app/globals.css`**: added `landing-surface` so the homepage uses the same `--background` base as the app shell.
- **`app/globals.css`**: added `landing-ambient` with a desktop ambient gradient and a narrower mobile media-query variant that removes the warm top-right wash from the mobile hero area.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |
| Production deploy | `npx vercel --prod --yes` | Passed; deployment ready |
| Production alias | `npx vercel inspect https://la-musica.vercel.app` | Ready; alias attached |
| Live homepage | `Invoke-WebRequest https://la-musica.vercel.app` | 200; content includes `landing-surface` |

## Lessons
- Page-level background tokens are easier to keep consistent across breakpoints than repeating one-off Tailwind gradient strings.
- Warm radial accents should be positioned more carefully on mobile because they cover a much larger share of the first viewport.

## Deployment
- Production URL: `https://la-musica.vercel.app`
- Deployment ID: `dpl_FQMpzMTS5T1mhQBFkM2vwXLCotuy`
- Inspector URL: `https://vercel.com/jeongwon-kim-s-projects/la-musica/FQMpzMTS5T1mhQBFkM2vwXLCotuy`
