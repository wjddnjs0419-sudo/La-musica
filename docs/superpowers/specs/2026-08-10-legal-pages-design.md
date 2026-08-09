# Legal Pages Design

## Goal

Restyle `/privacy` and `/terms` so they belong to the current La Musica visual system while preserving every legal document word, page metadata, email link, and route.

## Scope

- Rework only the shared `LegalPage` presentation component.
- Use the current near-black La Musica foundation (`#050505`), warm-white text (`#f4f1ea`), and thin monochrome borders.
- Use a simple 90px header with the existing logo at left and `Back to home` at right.
- Do not render the site Footer.

## Layout

- Desktop article width: approximately 760px, aligned in a broad page frame rather than a rounded card.
- Header content and article share consistent responsive horizontal gutters.
- Article begins with a `LEGAL` eyebrow, title, updated date, intro, then a horizontal divider.
- Legal sections use readable 16px body text, relaxed line height, consistent vertical rhythm, and a restrained heading scale.
- Lists retain semantic bullets; email links use warm-white underline treatment rather than blue.

## Responsive and Accessibility

- On mobile, retain the 90px header and reduce the horizontal gutter without reducing body text below 16px.
- Preserve semantic `main`, `header`, `article`, sections, headings, lists, and keyboard-visible links.
- Do not add animation, client state, data fetching, or new interactions.

## Out of Scope

- No Footer.
- No changes to Privacy Policy or Terms of Service wording, dates, metadata, contact address, or product/legal claims.
- No changes to routes, SEO structure, or authentication.
