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

// Feature claims for capabilities the product does NOT ship. These are
// outright false advertising — TenantFlow has no tenant screening, no
// automated workflows engine, no native mobile app, no rent processing.
// Matched case-insensitively. If a future product genuinely ships any of
// these, remove the corresponding entry.
const BANNED_FEATURE_CLAIMS = [
	'tenant screening',
	'automated workflow',
	'rent tracking',
	'mobile app access',
	'record rent',
	'paid rent',
	'pay rent',
	'rent processing',
	'process rent',
	'tenant invitation'
] as const

// Fabricated-identity / fabricated-team copy. Pass 7 of the perfect-PR
// loop deleted the about/page.tsx "Meet the Team" section that listed
// invented executives ("Alex Chen / CEO", "Sarah Johnson / CTO",
// "Mike Rodriguez / Head of Product"). The same fabricated-attribution
// class also produced fake testimonials (Sarah Chen / Westside
// Properties) and a fake HQ + phone number on the contact page. Until
// real attribution data exists, these phrases are banned outright.
const BANNED_FABRICATED_IDENTITY_CLAIMS = [
	'meet the team',
	'team behind tenantflow',
	'engineers, designers, and property management experts',
	'our team of engineers',
	'our diverse team'
] as const

// Dead plan names + stale prices that don't exist in PRICING_PLANS anymore.
// The real plans are Trial / Starter / Growth / Max at $0 / $29 / $79 / $199.
// Hardcoding the legacy "Professional" / "Enterprise" plan names or stale
// monthly prices ("$49", "$98", "$298") creates regressions like cycle-5 C-1
// (billing-settings.tsx hardcoded "Professional" + "$49/month" + "Up to 50
// units"). Anything matching this list must instead be sourced from
// `getAllPricingPlans()` / `getPricingPlan()` so it stays in sync with Stripe.
const BANNED_STALE_PLAN_REFS = [
	'professional plan',
	'enterprise plan',
	'$49/mo',
	'$49/month',
	'up to 50 units'
] as const

// SLA-shaped phrases (response-time commitments) Phase 67 demolished
// because no documented SLA exists. The codebase commits to "during US
// business hours, Monday through Friday" — anything more specific is
// unsubstantiated. Add new variants here as they appear.
const BANNED_SLA_CLAIMS = [
	'within 4 hours',
	'within 24 hours',
	'within 48 hours',
	'within an hour',
	'within minutes',
	'in minutes',
	'4-hour response',
	'24-hour response',
	'24-48h',
	'24/48 hour',
	'< 1 hour',
	'in under 5 minutes',
	'in under 10 minutes',
	'in under a minute',
	'under a minute',
	'in seconds',
	'a few minutes',
	'a few seconds',
	'few clicks',
	'response time guarantee',
	'guaranteed response',
	'fast response time',
	'fastest resolution',
	'fastest response',
	'instant setup',
	'instant onboarding',
	'24/7 priority support',
	'24/7 dedicated support',
	'24/7 phone',
	'24/7 chat'
] as const

// Vague superlatives that imply unsubstantiated quality claims. Replace
// with concrete capability descriptions (named tools, real shipped
// features, documented integrations).
const BANNED_SUPERLATIVES = [
	'best-in-class',
	'industry-leading',
	'world-class',
	'enterprise-grade',
	'perfect for',
	'intuitive interface',
	'no training required',
	'requires no training',
	'no learning curve',
	'zero learning curve',
	'cutting-edge',
	'state-of-the-art',
	'game-changer',
	'game-changing',
	'revolutionary',
	'next-generation',
	'next-gen',
	'breakthrough',
	'push boundaries',
	'real-time',
	'realtime',
	'in real time',
	'no technical skills',
	'no technical knowledge',
	'no coding required',
	'no setup required',
	'zero setup',
	'zero configuration',
	'powerful tools',
	'any size portfolio',
	'fits any portfolio',
	'fits any size'
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

type BanlistKind = 'phrases' | 'numeric' | 'feature' | 'stale_plan' | 'sla' | 'superlative' | 'fabricated_identity'

// Educational / third-party-expense content where banned phrases legitimately
// appear. Exemptions are scoped per-banlist so the file still gets scanned by
// the banlists it doesn't have a legitimate reason to fail.
//
// - tax-deduction-data.ts: lists "tenant screening" as a 3rd-party tax-
//   deductible expense (BANNED_FEATURE_CLAIMS) and "$2,400/year" as an example
//   landlord-insurance premium (BANNED_NUMERIC_CLAIMS). Neither is a
//   TenantFlow product claim.
// - lease-template.ts: contains "fails to pay rent" / "Failure to pay rent"
//   inside default-clause legal copy (BANNED_FEATURE_CLAIMS). That phrase is
//   part of the lease document the landlord sends to tenants, not a
//   TenantFlow product claim.
//
// Anything added here must be content where the phrase refers to something
// OUTSIDE the TenantFlow product (3rd-party services, IRS terms, lease
// document body, academic content, etc.).
const BANLIST_EXEMPTIONS: Record<string, readonly BanlistKind[]> = {
	'src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts': [
		'numeric',
		'feature'
	],
	'src/lib/templates/lease-template.ts': ['feature'],
	// security-policy is a documented vulnerability disclosure timeline
	// ("acknowledge within 24 hours", "assess within 72 hours", "90-day
	// coordinated disclosure"), not a marketing claim. The SLAs map to a
	// real public process at /security-policy and at .well-known/security.txt.
	'src/app/security-policy/page.tsx': ['sla'],
	// query-config.ts uses 'realtime' as a TanStack Query cache-tier
	// identifier (refetch every 30s) — internal infrastructure, not a
	// marketing claim. The banlist targets user-facing copy.
	'src/lib/constants/query-config.ts': ['superlative']
}

function isExemptFromBanlist(relPath: string, kind: BanlistKind): boolean {
	const normalized = relPath.replace(/\\/g, '/')
	return BANLIST_EXEMPTIONS[normalized]?.includes(kind) ?? false
}

function walkSourceFiles(root: string): string[] {
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
	if (isExemptFromBanlist(relPath, 'phrases')) return
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
	if (isExemptFromBanlist(relPath, 'numeric')) return
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

function scanFileForBannedFeatureClaims(absPath: string, relPath: string) {
	if (isExemptFromBanlist(relPath, 'feature')) return
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(`${relPath} (feature claims)`, () => {
		for (const phrase of BANNED_FEATURE_CLAIMS) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains banned feature claim "${phrase}" — these capabilities do not ship in the current product`
				).not.toContain(phrase.toLowerCase())
			})
		}
	})
}

function scanFileForStalePlanRefs(absPath: string, relPath: string) {
	if (isExemptFromBanlist(relPath, 'stale_plan')) return
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(`${relPath} (stale plan refs)`, () => {
		for (const phrase of BANNED_STALE_PLAN_REFS) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains stale plan reference "${phrase}" — source plan name and price from getAllPricingPlans()/getPricingPlan() instead`
				).not.toContain(phrase.toLowerCase())
			})
		}
	})
}

function scanFileForSlaClaims(absPath: string, relPath: string) {
	if (isExemptFromBanlist(relPath, 'sla')) return
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(`${relPath} (SLA claims)`, () => {
		for (const phrase of BANNED_SLA_CLAIMS) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains banned SLA claim "${phrase}" — no documented response-time commitment exists; use "during US business hours, Monday through Friday" instead`
				).not.toContain(phrase.toLowerCase())
			})
		}
	})
}

function scanFileForSuperlatives(absPath: string, relPath: string) {
	if (isExemptFromBanlist(relPath, 'superlative')) return
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(`${relPath} (superlatives)`, () => {
		for (const phrase of BANNED_SUPERLATIVES) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains banned superlative "${phrase}" — replace with concrete capability descriptions (named tools, shipped features, documented integrations)`
				).not.toContain(phrase.toLowerCase())
			})
		}
	})
}

function scanFileForFabricatedIdentities(absPath: string, relPath: string) {
	if (isExemptFromBanlist(relPath, 'fabricated_identity')) return
	const content = readFileSync(absPath, 'utf8').toLowerCase()
	describe(`${relPath} (fabricated identities)`, () => {
		for (const phrase of BANNED_FABRICATED_IDENTITY_CLAIMS) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains banned fabricated-identity claim "${phrase}" — invented team members / testimonials / contact details are banned until real attribution data is available`
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
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForBannedPhrases(absPath, relative(cwd, absPath))
	}
})

describe('Component copy: numeric claims (v2.7 Phase 67)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForBannedNumericClaims(absPath, relative(cwd, absPath))
	}
})

describe('Marketing copy: feature claims (v2.7 Phase 67)', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForBannedFeatureClaims(join(cwd, relPath), relPath)
	}
})

describe('Component copy: feature claims (v2.7 Phase 67)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForBannedFeatureClaims(absPath, relative(cwd, absPath))
	}
})

// Cycle-4 C-2: extend the guard to every page under src/app/** so authenticated
// routes (billing, settings, dashboard) can't ship stale marketing copy. The
// previous component-only walker missed `(owner)/billing/plans/page.tsx` which
// was claiming "Rent tracking" as a paid feature on the live trial-banner CTA.
describe('App routes: landlord-only product (cycle-4 C-2)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForBannedPhrases(absPath, relative(cwd, absPath))
	}
})

describe('App routes: numeric claims (cycle-4 C-2)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForBannedNumericClaims(absPath, relative(cwd, absPath))
	}
})

describe('App routes: feature claims (cycle-4 C-2)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForBannedFeatureClaims(absPath, relative(cwd, absPath))
	}
})

// Cycle-5 C-1: stale plan-name / stale-price guard. Catches the failure mode
// where a hand-coded "Professional / $49/month / Up to 50 units" block ships
// to authenticated users despite the marketing site, Stripe, and PRICING_PLANS
// agreeing on Trial / Starter / Growth / Max ($0/$29/$79/$199).
describe('Marketing copy: stale plan refs (cycle-5 C-1)', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForStalePlanRefs(join(cwd, relPath), relPath)
	}
})

describe('Component copy: stale plan refs (cycle-5 C-1)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForStalePlanRefs(absPath, relative(cwd, absPath))
	}
})

describe('App routes: stale plan refs (cycle-5 C-1)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForStalePlanRefs(absPath, relative(cwd, absPath))
	}
})

// Cycle-6 C-1: extend the guard to src/lib/**. The trigger was the dead
// BILLING_PLANS block in src/lib/constants/billing.ts (deleted in the same
// commit) which carried stale pricing alongside the real PRICING_PLANS in
// src/config/pricing.ts. The walker doesn't catch raw numeric literals
// (`monthly: 49`), but it does catch quoted forms ('$49/mo'), banned phrases,
// and stale plan-name strings — closing the surface for future regressions
// shaped like the cycle-1..5 findings.
describe('Lib: landlord-only product (cycle-6 C-1)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForBannedPhrases(absPath, relative(cwd, absPath))
	}
})

describe('Lib: numeric claims (cycle-6 C-1)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForBannedNumericClaims(absPath, relative(cwd, absPath))
	}
})

describe('Lib: feature claims (cycle-6 C-1)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForBannedFeatureClaims(absPath, relative(cwd, absPath))
	}
})

describe('Lib: stale plan refs (cycle-6 C-1)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForStalePlanRefs(absPath, relative(cwd, absPath))
	}
})

// Perfect-PR loop pass 4: catch SLA-shaped "within N hours" commitments and
// vague superlatives like "best-in-class" / "industry-leading". Both classes
// of claim slipped through the prior banlists because they don't match any
// dollar / percentage / plan-name pattern.
describe('Marketing copy: SLA claims (loop pass 4)', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForSlaClaims(join(cwd, relPath), relPath)
	}
})

describe('Component copy: SLA claims (loop pass 4)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForSlaClaims(absPath, relative(cwd, absPath))
	}
})

describe('App routes: SLA claims (loop pass 4)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForSlaClaims(absPath, relative(cwd, absPath))
	}
})

describe('Lib: SLA claims (loop pass 4)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForSlaClaims(absPath, relative(cwd, absPath))
	}
})

describe('Marketing copy: superlatives (loop pass 4)', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForSuperlatives(join(cwd, relPath), relPath)
	}
})

describe('Component copy: superlatives (loop pass 4)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForSuperlatives(absPath, relative(cwd, absPath))
	}
})

describe('App routes: superlatives (loop pass 4)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForSuperlatives(absPath, relative(cwd, absPath))
	}
})

describe('Lib: superlatives (loop pass 4)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForSuperlatives(absPath, relative(cwd, absPath))
	}
})

// Loop pass 8: catch fabricated team / testimonial / identity copy that
// would re-introduce the deleted "Meet the Team" surface or its peers.
describe('Marketing copy: fabricated identities (loop pass 8)', () => {
	const cwd = process.cwd()
	for (const relPath of MARKETING_FILES) {
		scanFileForFabricatedIdentities(join(cwd, relPath), relPath)
	}
})

describe('Component copy: fabricated identities (loop pass 8)', () => {
	const cwd = process.cwd()
	const componentsRoot = join(cwd, 'src', 'components')
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForFabricatedIdentities(absPath, relative(cwd, absPath))
	}
})

describe('App routes: fabricated identities (loop pass 8)', () => {
	const cwd = process.cwd()
	const appRoot = join(cwd, 'src', 'app')
	for (const absPath of walkSourceFiles(appRoot)) {
		scanFileForFabricatedIdentities(absPath, relative(cwd, absPath))
	}
})

describe('Lib: fabricated identities (loop pass 8)', () => {
	const cwd = process.cwd()
	const libRoot = join(cwd, 'src', 'lib')
	for (const absPath of walkSourceFiles(libRoot)) {
		scanFileForFabricatedIdentities(absPath, relative(cwd, absPath))
	}
})
