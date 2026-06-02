# DESIGN.md

The design system for this portfolio. It is a single static page (`index.html`), so
the system lives in the `:root` token block at the top of that file. This document is
the source of truth for _why_ those tokens exist; the CSS is the implementation.

Register: **brand**. The page is the product. A recruiter's first impression is the
thing being made, so the page itself has to demonstrate the design-system craft it
claims as expertise.

## 1. Palette — "Petrol Ink"

One committed hue. Not a two-stop gradient, not a multi-accent rainbow.

- **Hue:** OKLCH `H ≈ 215` (blue-green / petrol). A desaturated engineered ink.
- **Rationale / POV:** the brand-voice words are _precise, structural, engineered_
  (this person designs architecture, builds infra, ships design systems). Petrol ink
  reads as drafting ink and tooling, committed but not loud. It deliberately rejects
  two training-data reflexes: the banned template purple (`#667eea → #764ba2`) and the
  obvious "dev / design-tool" cool indigo-blue. The hue is the _only_ hue on the page;
  every neutral is tinted toward it (chroma `0.004–0.02`), so nothing is a dead gray
  and nothing is `#000` / `#fff`.
- **Strategy:** Restrained-committed. The header is a single drenched petrol field
  (color as voice); the body stays a document — tinted paper, ink text, one accent for
  links and numeral kickers. A resume must read as a document, so we do not drench the
  whole surface, but the accent is owned, not hedged.

### Tokens

| Token          | OKLCH             | Role                                   |
| -------------- | ----------------- | -------------------------------------- |
| `--ink`        | `0.32 0.046 215`  | Dominant: header field, buttons, links |
| `--ink-strong` | `0.26 0.05 215`   | Hover / pressed                        |
| `--ink-soft`   | `0.52 0.038 215`  | Numeral kickers, tick marks, company   |
| `--paper`      | `0.985 0.004 215` | Page background                        |
| `--surface`    | `0.997 0.002 215` | Section field, light-on-dark text      |
| `--raise`      | `0.965 0.006 215` | Recessed panels, skill tags            |
| `--line`       | `0.92 0.008 215`  | Hairlines                              |
| `--line-soft`  | `0.95 0.006 215`  | Quieter hairlines (project rows)       |
| `--text`       | `0.27 0.018 215`  | Body                                   |
| `--text-2`     | `0.46 0.016 215`  | Secondary / meta                       |
| `--text-3`     | `0.6 0.013 215`   | Tertiary / dates                       |

Chroma drops toward the lightness extremes (paper/surface sit at `0.002–0.006`) so the
near-white tones never look garish. The header gradient is a _near-flat_ tonal shift
(`oklch(0.34 0.05 215)` → `oklch(0.3 0.044 220)`), not the old 135° two-stop AI gradient.

### Print / PDF

`@media print` and the html2pdf path (`html2canvas` captures the rendered DOM) both use
the same `--ink` field, so the PDF cannot diverge from the screen palette. The old
hardcoded `#667eea` in the print block is gone.

## 2. Typography

- **Family:** `Pretendard Variable` (KR + Latin), `-apple-system` fallback. Pretendard
  is the de-facto system typeface for Korean product teams and is already the documented
  body font in this person's own design-system guide
  (`public/개발가이드/20_디자인_시스템_가이드.md`). Using it here is an authored, named
  choice consistent with the documented system, not a reflex Inter / DM Sans pick.
- **Hierarchy is scale + weight, never color.** Fluid `clamp()`, ratio ≈ 1.28:

  | Step    | Size token    | Weight | Use                       |
  | ------- | ------------- | ------ | ------------------------- |
  | Name    | `--t-name`    | 800    | `h1`, tracking `-0.03em`  |
  | Section | `--t-h2`      | 750    | `h2`                      |
  | Subhead | `--t-h3`      | 650    | `h3`, company names       |
  | Body    | `--t-body`    | 400    | prose                     |
  | Eyebrow | `--t-eyebrow` | 600    | header kicker, tag labels |

- **Section heads** carry a tabular numeral kicker (`01`–`11` via `data-index` +
  `h2::before`) instead of the old `border-bottom: 3px solid` rule, so sections feel
  authored and indexed.
- **Measure:** prose blocks and the `.lede` are capped (`max-width: 68–72ch`).
- Dates use `font-variant-numeric: tabular-nums` for aligned ledger rows.

## 3. Layout & rhythm

- Single column, `--maxw: 880px`, asymmetric left-aligned text (not a centered stack).
- Vertical rhythm varies with `clamp()`: generous air before each section
  (`border-top` hairline + large top padding), tighter inside lists.
- **No cards.** Projects and skills are open ledger rows separated by hairlines, not
  boxed cards. The old white card-with-shadow sections are now hairline-divided bands.

## 4. Motion

- Easing: ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)` for the few transitions (link
  underline, button background). No layout-property animation, no bounce.
- `prefers-reduced-motion` disables transitions.

## 5. Bans removed (this redesign)

These were the template tells fixed in the OKLCH redesign. Do not reintroduce them.

1. **AI purple gradient.** `#667eea → #764ba2` two-stop header gradient → single
   committed `--ink` field with a near-flat tonal shift.
2. **Side-stripe borders.** `border-left: 4px solid` on `.skill-category` and
   `.project-card` (grew to `6px` on hover) → removed entirely. Differentiation is now
   typographic weight + whitespace + hairlines. (Absolute ban: side-stripe accents.)
3. **Header pulse loop.** `header::before` 4s infinite `pulse` radial-glow animation →
   removed.
4. **Blanket hover lifts.** `translateY(-2px)` on `.section`, `.skill-tag`,
   `.save-button` → removed. Hover now changes color/border only.
5. **Hero-metric wall.** "정량적 성과 요약" big-number/small-label list → reframed as
   "성과, 숫자로", three authored prose statements with the numbers woven inline.
   (Absolute ban: the hero-metric template.)
6. **Emoji as design.** `✨` before achievements and injected `📎` before links →
   typographic tick mark and a quiet underline. Save buttons lost their emoji labels.
7. **Traffic-light buttons.** green / blue / orange save buttons → one quiet family:
   filled `--ink` ("PDF 저장") + outlined ("인쇄").

## 6. Untinted neutrals — banned

Never `#000` / `#fff` / `#333` / `#666`. Every neutral is one of the `--text-*`,
`--line-*`, `--paper` / `--surface` / `--raise` tokens, all tinted toward `H 215`.
