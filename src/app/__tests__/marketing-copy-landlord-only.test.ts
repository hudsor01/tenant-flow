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

// Phrases that must not appear in any scanned file.
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

// Explicit marketing surfaces (kept as a stable allowlist — catches files that
// might not match the components walker, e.g. /app/pages, config, SEO helpers).
const MARKETING_FILES = [
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

describe('Marketing copy: landlord-only product', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForBannedPhrases(join(cwd, relPath), relPath)
	}
})

describe('Component copy: landlord-only product (REQ-52-06)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkComponentFiles(componentsRoot)) {
		scanFileForBannedPhrases(absPath, relative(cwd, absPath))
	}
})
