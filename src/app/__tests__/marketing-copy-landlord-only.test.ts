/**
 * Marketing copy guard: tenant portal + rent-collection features were removed.
 * The product is now a landlord-only property administration SaaS.
 *
 * This test scans marketing surfaces + every non-test file under `src/components/**`
 * for banned phrases that describe features that no longer exist (online rent
 * collection, tenant portal, autopay, etc.). Any occurrence in the scanned files
 * is a regression (REQ-52-06).
 *
 * Test files (`__tests__/`, `.test.`, `.spec.`) and the marketing-copy test itself
 * are skipped so that banned-phrase string literals used in assertions do not
 * trigger a false positive.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Feature-claim phrases that describe surfaces that no longer exist
// (rent collection, tenant portal, autopay). Any occurrence is a
// regression — these features were demolished in migration
// 20260418183608 and the marketing copy must reflect the new shape.
// Matched case-insensitively.
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

// Numeric / dollar / SLA / guarantee claims that v2.7 Phase 67 removed
// because we couldn't substantiate them. Reintroducing any of these
// phrases is a regression — if a future page genuinely needs to cite
// a number, it must come with a documented methodology.
const BANNED_NUMERIC_CLAIMS = [
	'$30,000',
	'$2,400',
	'$2.4k',
	'40% noi',
	'47% noi',
	'45% noi',
	'noi by 40',
	'noi by 47',
	'noi by 45',
	'noi increase',
	'reduce vacancy by',
	'vacancy by 65',
	'vacancy by 70',
	'maintenance costs by 32',
	'maintenance costs by 35',
	'automate 80%',
	'80% of tasks',
	'roi in 30 days',
	'roi in 60 days',
	'roi in 90 days',
	'roi within 90 days',
	'90-day roi',
	'60-day roi',
	'roi within 2.3',
	'money-back guarantee',
	'money back guarantee',
	'60-day money',
	'99.9% uptime',
	'soc 2 type ii',
	'bank-level security',
	'bank-level encryption',
	'10,000+ property',
	'10,000+ managers',
	'2,500+ user',
	'25 hrs saved',
	'20+ hours per week',
	'25+ hours per week',
	'4.9/5',
	'98.7%'
] as const

// Explicit marketing surfaces (kept as a stable allowlist — catches files that
// might not match the components walker, e.g. /app/pages, config, SEO helpers).
const MARKETING_FILES = [
	'src/app/page.tsx',
	'src/app/marketing-home.tsx',
	'src/app/pricing/page.tsx',
	'src/app/pricing/pricing-content.tsx',
	'src/app/features/page.tsx',
	'src/app/features/features-client.tsx',
	'src/app/faq/page.tsx',
	'src/app/blog/page.tsx',
	'src/app/support/page.tsx',
	'src/app/about/page.tsx',
	'src/app/help/page.tsx',
	'src/app/(auth)/login/page.tsx',
	'src/app/(auth)/login/layout.tsx',
	'src/app/auth/confirm-email/confirm-email-states.tsx',
	'src/app/opengraph-image.tsx',
	'src/app/compare/[competitor]/page.tsx',
	'src/app/compare/[competitor]/compare-data.ts',
	'src/data/faqs.ts',
	'src/config/pricing.ts',
	'src/lib/generate-metadata.ts'
] as const

function isTestPath(relPath: string): boolean {
	return (
		relPath.includes('/__tests__/') ||
		relPath.includes('.test.') ||
		relPath.includes('.spec.') ||
		relPath.endsWith('.d.ts')
	)
}

function walkComponentFiles(root: string): string[] {
	const entries = readdirSync(root, { recursive: true, withFileTypes: true })
	const files: string[] = []
	for (const entry of entries) {
		if (!entry.isFile()) continue
		const parentPath = (entry as { parentPath?: string; path?: string }).parentPath ??
			(entry as { path?: string }).path ??
			''
		const absPath = join(parentPath, entry.name)
		if (!/\.(ts|tsx)$/.test(entry.name)) continue
		if (isTestPath(absPath)) continue
		files.push(absPath)
	}
	return files
}

function scanFileForBannedPhrases(absPath: string, relPath: string) {
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(relPath, () => {
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

function scanFileForBannedNumericClaims(absPath: string, relPath: string) {
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(`${relPath} (numeric claims)`, () => {
		for (const phrase of BANNED_NUMERIC_CLAIMS) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains banned numeric claim "${phrase}" — Phase 67 removed unsubstantiated marketing numbers`
				).not.toContain(phrase.toLowerCase())
			})
		}
	})
}

describe('Marketing copy: landlord-only product', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForBannedPhrases(join(cwd, relPath), relPath)
	}
})

describe('Marketing copy: numeric claims (v2.7 Phase 67)', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForBannedNumericClaims(join(cwd, relPath), relPath)
	}
})

describe('Component copy: landlord-only product (REQ-52-06)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkComponentFiles(componentsRoot)) {
		scanFileForBannedPhrases(absPath, relative(cwd, absPath))
	}
})

describe('Component copy: numeric claims (v2.7 Phase 67)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkComponentFiles(componentsRoot)) {
		scanFileForBannedNumericClaims(absPath, relative(cwd, absPath))
	}
})
