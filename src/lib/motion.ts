/*
 * Shared motion primitives for the "Executive Signal" portfolio.
 *
 * Every variant here is reduced-motion aware via `useMotionConfig`: when the
 * user (or CI release gate) requests reduced motion we collapse transforms to a
 * plain crossfade so nothing slides, scales, or spins — content still appears,
 * just instantly and calmly. Framer Motion already reads
 * `prefers-reduced-motion`, but we also gate the decorative bits (animated
 * accents, particle field) on the same signal so the whole surface stays in
 * sync.
 */
import { useEffect, useState } from 'react'
import type { Transition, Variants } from 'framer-motion'

/** Exponential ease-out — calm, confident, no bounce. */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1]

const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 18,
  mass: 0.9,
}

/**
 * Subscribes to `prefers-reduced-motion`. SSR/headless-safe: defaults to
 * "motion allowed" so the first paint is never blank, then corrects on mount.
 */
export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}

export interface MotionConfig {
  reduced: boolean
  /** Container that staggers its children (or crossfades when reduced). */
  container: Variants
  /** Item that rises + fades in (or just fades when reduced). */
  item: Variants
  /** Item that slides in from the left (timelines etc). */
  itemLeft: Variants
  /** Spring transition tuned for hover/press, neutered when reduced. */
  spring: Transition
}

const REVEAL_DISTANCE = 22

/**
 * Returns a coherent set of variants for the current motion preference.
 * Pass the result into `<motion.*>` `variants` props with
 * initial="hidden" animate="visible" (or whileInView).
 */
export function useMotionConfig(): MotionConfig {
  const reduced = useReducedMotionPref()

  const container: Variants = {
    hidden: { opacity: reduced ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: reduced ? { duration: 0.001 } : { staggerChildren: 0.09, delayChildren: 0.04 },
    },
  }

  const item: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.25 } },
      }
    : {
        hidden: { opacity: 0, y: REVEAL_DISTANCE },
        visible: { opacity: 1, y: 0, transition: SPRING_SOFT },
      }

  const itemLeft: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.25 } },
      }
    : {
        hidden: { opacity: 0, x: -REVEAL_DISTANCE },
        visible: { opacity: 1, x: 0, transition: SPRING_SOFT },
      }

  const spring: Transition = reduced
    ? { duration: 0.15, ease: EASE_OUT_QUART }
    : { type: 'spring', stiffness: 320, damping: 22 }

  return { reduced, container, item, itemLeft, spring }
}

/** Standard viewport config for scroll-reveal: fire once, a touch early. */
export const REVEAL_VIEWPORT = { once: true, margin: '0px 0px -12% 0px' } as const
