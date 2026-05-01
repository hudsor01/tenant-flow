/**
 * Shared types for marketing surfaces (homepage, /features, /pricing).
 *
 * Phase 67 (v2.7) consolidated the duplicate Testimonial shape that lived
 * in `src/components/landing/features-data.ts` and
 * `src/components/sections/testimonials-section.tsx` into this single
 * source of truth (Zero Tolerance Rule 3 — no duplicate types).
 */

export interface Testimonial {
	quote: string
	author: string
	title: string
	company: string
	avatar?: string
	metric?: string
	metricLabel?: string
}
