# DESIGN.md

Design system for the portfolio resume. The site is still a single static page
(`index.html`), so the implementation lives in the `:root` token block and the
CSS inside that file. This document records the design intent so future edits do
not drift back into generic resume templates.

Register: **executive product resume**. The page must work as a resume first, but
it should also demonstrate that the candidate can ship polished product surfaces,
not only document content.

## 1. Palette - "Executive Signal"

The previous system used one petrol hue. The new system keeps petrol as the
structural ink and adds four signal accents so the page feels richer without
becoming a rainbow.

- **Petrol ink:** structure, body links, primary controls.
- **Coral:** business impact and change.
- **Gold:** delivery, ownership, first-read highlights.
- **Mint:** quality, stability, testing.
- **Cobalt:** architecture and systems thinking.

All colors are expressed as OKLCH tokens in `index.html`. Avoid raw hex values
for page color, text, borders, and controls.

### Tokens

| Token             | OKLCH                    | Role                               |
| ----------------- | ------------------------ | ---------------------------------- |
| `--ink`           | `0.3 0.058 214`          | Links, primary controls, structure |
| `--ink-strong`    | `0.24 0.064 214`         | Hover / pressed states             |
| `--ink-soft`      | `0.5 0.048 214`          | Secondary ink                      |
| `--field`         | `0.2 0.034 218`          | Hero field                         |
| `--field-2`       | `0.27 0.054 210`         | Hero field tonal shift             |
| `--accent-coral`  | `0.67 0.17 31`           | Business impact                    |
| `--accent-gold`   | `0.78 0.13 86`           | Delivery and first-read highlights |
| `--accent-mint`   | `0.68 0.13 166`          | Quality and reliability            |
| `--accent-cobalt` | `0.56 0.14 249`          | Architecture and systems           |
| `--paper`         | `0.982 0.006 210`        | Page background                    |
| `--surface`       | `0.997 0.003 210`        | Section and card surface           |
| `--surface-glass` | `0.997 0.003 210 / 0.78` | Soft section field                 |
| `--raise`         | `0.956 0.012 210`        | Tags and low-emphasis surfaces     |
| `--line`          | `0.88 0.016 210`         | Hairlines                          |
| `--line-soft`     | `0.93 0.012 210`         | Quieter borders                    |
| `--text`          | `0.25 0.022 214`         | Body text                          |
| `--text-2`        | `0.43 0.02 214`          | Secondary text                     |
| `--text-3`        | `0.58 0.018 214`         | Dates and tertiary metadata        |

## 2. Typography

- **Family:** `Pretendard Variable`, with system fallbacks.
- **Scale:** fixed rem steps. Breakpoints may swap token values, but font size is
  not tied to viewport width.
- **Letter spacing:** `0` throughout the UI. The site does not use negative
  tracking for polish.
- **Name:** `--t-name`, weight 800.
- **Section headings:** `--t-h2`, weight 750, with a numbered pill and short
  accent rule.
- **Subheads and company names:** `--t-h3`, weight 650.
- **Measure:** prose stays around `66-72ch`; project cards and ledes keep readable
  line lengths.
- **Dates:** tabular numerals for stable ledger rows.

## 3. Layout

- First viewport is a dense hero: identity, positioning statement, proof metrics,
  and contact/proof links.
- Content sections use a two-column editorial layout on desktop:
  section index on the left, content on the right.
- Mobile collapses to a single column with the same reading order.
- Repeated work and project items may use cards, but card radius stays at `8px`
  or less.
- Do not put cards inside cards. Page sections remain full-width content bands
  inside the main container.

## 4. Components

- **Hero metrics:** four compact impact cards for years, projects, bundle
  reduction, and VOC reduction.
- **Contact chips:** compact link/info chips with stable wrapping for long URLs.
- **Project cards:** repeated items with light borders, subtle accent wash, and
  hover border/shadow states.
- **Project snapshots:** local JPEG captures of each public demo home screen.
  They sit near the top of personal project cards, use a fixed `16 / 10`
  frame on screen, and are shortened in PDF capture so the resume stays
  scannable.
- **Skill tags:** small bordered chips tinted by the current section accent.
- **Save buttons:** fixed action controls for PDF and print. They keep visible
  focus rings and hide in print.

## 5. Motion

- Motion is additive and uses transform/opacity only.
- Hero content rises in once; section content reveals on scroll.
- `prefers-reduced-motion: reduce` disables animation and forces all reveal-gated
  content visible.
- Print/PDF capture also force-reveals content so generated PDFs are never blank.

## 6. Print / PDF

Print mode pins the light token set, hides fixed save buttons, removes the large
hero watermark, and keeps the resume readable on paper. The hero field remains
print-color-adjusted so the exported PDF resembles the screen without exhausting
ink through decorative effects.

PDF export uses local project snapshot files under `public/project-snapshots/`
instead of hotlinking live demo pages. The save flow waits for all `<img>`
elements to finish loading before calling `html2canvas`, then writes the captured
canvas into `jsPDF` page slices. This avoids blank exports and keeps project
previews available offline.

## 7. Guardrails

Do not reintroduce:

- Generic purple gradient hero treatments.
- Decorative orbs, bokeh blobs, or background blobs.
- Side-stripe accents on every item.
- Emoji as visual design.
- Cards nested inside cards.
- Viewport-width font scaling.
- Negative letter spacing.
- Untinted hard neutrals such as raw black, white, or mid-gray hex values.
