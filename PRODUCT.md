# Product

## Register

brand

## Users

Recruiters, hiring managers, and technical interviewers (primarily at Korean tech
companies — see the interview Q&A content referencing 우아한형제들)
evaluating a senior/staff-level frontend engineer. They skim quickly, often on
mobile, deciding whether to advance the candidate. Secondarily, the site owner
himself uses it to review and rehearse his own interview answers before a
real interview.

## Product Purpose

A living resume/portfolio (heejun.cloud) that simultaneously (1) documents 18
years of frontend architecture experience — career history, quantified
achievements, personal projects — and (2) functions as a proof-of-work: the
page's own production quality is evidence of the candidate's frontend craft.
Success is a reader who leaves convinced of technical credibility, remembers
specific outcomes (bundle -70%, VOC -69%, 5-hour incident resolution, etc.),
and can retrieve interview-prep content fast when needed.

## Brand Personality

Precise, credible, understated confidence — "executive signal," not SaaS
marketing. The site earns trust through proof (numbers, named systems,
concrete outcomes) rather than adjectives or decoration. Calm and editorial,
not flashy.

## Anti-references

- Generic Canva-style resume templates (icon-in-circle skill grids, rainbow
  gradient headers, cookie-cutter timelines).
- SaaS marketing clichés: gradient text, hero-metric-template cards, bouncy/
  elastic motion, tiny uppercase tracked eyebrows on every section.
- Anything that reads as templated or "AI made this" rather than as a real
  engineer's own crafted surface.

## Design Principles

1. **The page is itself a work sample.** Every visual decision should read as
   evidence of frontend competence, not decoration for its own sake.
2. **Proof over adjectives.** Numbers, named systems, and specific outcomes
   beat generic claims — let the content's own precision carry the design.
3. **Scannable under pressure.** Recruiters and interviewers skim in seconds,
   frequently on mobile; hierarchy must work at a glance, not just on close
   reading.
4. **Content fidelity is non-negotiable.** Resume and interview-answer content
   is real, verbatim professional material — never truncate, water down, or
   alter meaning in service of a layout.
5. **Restraint over spectacle.** Accent color and motion earn their place;
   default posture is calm, structured, editorial — not a rainbow, not inert.

## Accessibility & Inclusion

The site targets WCAG AA: reduced-motion is respected globally
(`prefers-reduced-motion` collapses all CSS transitions/animations), focus
rings are consistent across every interactive element via a global
`:focus-visible` rule, and it has already passed a 360px legibility/contrast
pass. It does not yet have a skip link, route-change focus management, or
per-page document titles — treat those as open gaps, not existing baseline,
if a task touches navigation or routing. New UI must hold ≥4.5:1 body-text
contrast, full keyboard operability, and a `prefers-reduced-motion` fallback,
and should meet the same 360px bar.
