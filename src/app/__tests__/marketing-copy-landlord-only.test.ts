/**
 * Marketing copy guard: tenant portal + rent-collection features were removed.
 * The product is now a landlord-only property administration SaaS.
 *
 * This test scans user-facing marketing surfaces for banned phrases that
 * describe features that no longer exist (online rent collection, tenant portal,
 * autopay, etc.). Any occurrence in the scanned files is a regression.
 *
 * Scoped to marketing surfaces only — internal code (types, hooks, mutation
 * keys, detail views) may still reference autopay/tenant portal terms because
 * the underlying schema and hooks are being torn down on a separate track.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Phrases that must not appear in any marketing surface file.
// Each phrase is matched case-insensitively.
const BANNED_PHRASES = [
	'rent collection',
	'online rent',
	'autopay',
	'auto-pay',
	'tenant portal',
	'automated rent',
	'collect rent',
	'rent processing',
	'pay rent online',
	'online payments',
	'online rent payment',
	'rent collection software',
	'tenants can pay',
	'pay rent through'
] as const

// Marketing surfaces. Paths are relative to the repo root.
const MARKETING_FILES = [
	// Pages
	'src/app/page.tsx',
	'src/app/marketing-home.tsx',
	'src/app/pricing/page.tsx',
	'src/app/features/page.tsx',
	'src/app/features/features-client.tsx',
	'src/app/faq/page.tsx',
	'src/app/blog/page.tsx',
	'src/app/support/page.tsx',
	'src/app/(auth)/login/layout.tsx',
	'src/app/compare/[competitor]/page.tsx',
	'src/app/compare/[competitor]/compare-data.ts',
	// Marketing sections/components
	'src/components/sections/features-section.tsx',
	'src/components/sections/testimonials-section.tsx',
	'src/components/sections/how-it-works.tsx',
	'src/components/sections/home-faq.tsx',
	'src/components/sections/comparison-table.tsx',
	'src/components/sections/hero-dashboard-mockup.tsx',
	'src/components/landing/bento-features-section.tsx',
	'src/components/landing/feature-backgrounds.tsx',
	'src/components/landing/feature-callouts.tsx',
	'src/components/landing/hero-section.tsx',
	'src/components/blog/blog-inline-cta.tsx',
	'src/components/pricing/pricing-comparison-table.tsx',
	// Data/config
	'src/data/faqs.ts',
	'src/config/pricing.ts',
	// SEO
	'src/lib/generate-metadata.ts'
] as const

describe('Marketing copy: landlord-only product', () => {
	for (const relPath of MARKETING_FILES) {
		describe(relPath, () => {
			const absPath = join(process.cwd(), relPath)
			const content = readFileSync(absPath, 'utf8').toLowerCase()

			for (const phrase of BANNED_PHRASES) {
				it(`must not mention "${phrase}"`, () => {
					expect(
						content,
						`${relPath} contains banned phrase "${phrase}" — tenant portal + rent collection features were removed`
					).not.toContain(phrase.toLowerCase())
				})
			}
		})
	}
})
