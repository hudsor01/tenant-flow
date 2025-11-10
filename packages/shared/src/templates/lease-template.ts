import type { LeaseFormData, USState } from '../types/lease-generator.types'

export interface LeaseTemplateClause {
	id: string
	title: string
	description: string
	tooltip: string
	defaultSelected: boolean
	body: string
	stateLimitation?: USState[]
	requiresOption?: 'includeStateDisclosures' | 'includeFederalDisclosures'
}

export interface LeaseTemplateSection {
	id: string
	title: string
	description: string
	clauses: LeaseTemplateClause[]
}

export interface LeaseTemplateStateRule {
	state: USState
	stateName: string
	notices: string[]
	recommendedClauses?: string[]
}

export interface LeaseTemplateSchema {
	version: string
	sections: LeaseTemplateSection[]
	stateRules: Record<USState, LeaseTemplateStateRule>
	federalNotices: string[]
	glossary: Record<string, string>
}

export interface CustomClause {
	id: string
	title: string
	body: string
}

export interface LeaseTemplateSelections {
	state: USState
	selectedClauses: string[]
	includeStateDisclosures: boolean
	includeFederalDisclosures: boolean
	customClauses?: CustomClause[]
}

export interface LeaseTemplateContext {
	ownerName: string
	ownerAddress: string
	tenantNames: string
	propertyAddress: string
	propertyState: USState
	rentAmountCents: number
	rentAmountFormatted: string
	rentDueDay: number
	rentDueDayOrdinal: string
	securityDepositCents: number
	securityDepositFormatted: string
	leaseStartDateISO: string
	leaseEndDateISO?: string
	leaseStartDateFormatted: string
	leaseEndDateFormatted?: string
	lateFeeAmountCents?: number
	lateFeeAmountFormatted?: string
	gracePeriodDays?: number
	formattedDateGenerated: string
}

export interface LeaseTemplatePreviewRequest {
	selections: LeaseTemplateSelections
	context: LeaseTemplateContext
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param unsafe - User-provided string that may contain malicious HTML/JS
 * @returns Escaped string safe for HTML insertion
 */
function escapeHtml(unsafe: string): string {
	if (typeof unsafe !== 'string') {
		return String(unsafe)
	}
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

const stateNames: Record<USState, string> = {
	AL: 'Alabama',
	AK: 'Alaska',
	AZ: 'Arizona',
	AR: 'Arkansas',
	CA: 'California',
	CO: 'Colorado',
	CT: 'Connecticut',
	DE: 'Delaware',
	FL: 'Florida',
	GA: 'Georgia',
	HI: 'Hawaii',
	ID: 'Idaho',
	IL: 'Illinois',
	IN: 'Indiana',
	IA: 'Iowa',
	KS: 'Kansas',
	KY: 'Kentucky',
	LA: 'Louisiana',
	ME: 'Maine',
	MD: 'Maryland',
	MA: 'Massachusetts',
	MI: 'Michigan',
	MN: 'Minnesota',
	MS: 'Mississippi',
	MO: 'Missouri',
	MT: 'Montana',
	NE: 'Nebraska',
	NV: 'Nevada',
	NH: 'New Hampshire',
	NJ: 'New Jersey',
	NM: 'New Mexico',
	NY: 'New York',
	NC: 'North Carolina',
	ND: 'North Dakota',
	OH: 'Ohio',
	OK: 'Oklahoma',
	OR: 'Oregon',
	PA: 'Pennsylvania',
	RI: 'Rhode Island',
	SC: 'South Carolina',
	SD: 'South Dakota',
	TN: 'Tennessee',
	TX: 'Texas',
	UT: 'Utah',
	VT: 'Vermont',
	VA: 'Virginia',
	WA: 'Washington',
	WV: 'West Virginia',
	WI: 'Wisconsin',
	WY: 'Wyoming',
	DC: 'District of Columbia'
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD'
})

function formatCurrency(cents: number) {
	return currencyFormatter.format(cents / 100)
}

function formatDate(iso: string | undefined) {
	if (!iso) return ''
	const date = new Date(iso)
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

function formatOrdinal(input: number) {
	const suffixes = ['th', 'st', 'nd', 'rd']
	const v = input % 100
	const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]
	return `${input}${suffix}`
}

const DEFAULT_CONTEXT: LeaseTemplateContext = {
	ownerName: 'Owner Name',
	ownerAddress: '123 Main Street, Suite 200, Springfield, IL 62701',
	tenantNames: 'Tenant One; Tenant Two',
	propertyAddress: '456 Elm Street, Springfield, IL 62701',
	propertyState: 'IL',
	rentAmountCents: 180000,
	rentAmountFormatted: formatCurrency(180000),
	rentDueDay: 1,
	rentDueDayOrdinal: formatOrdinal(1),
	securityDepositCents: 180000,
	securityDepositFormatted: formatCurrency(180000),
	leaseStartDateISO: new Date().toISOString(),
	leaseStartDateFormatted: formatDate(new Date().toISOString()),
	lateFeeAmountCents: 5000,
	lateFeeAmountFormatted: formatCurrency(5000),
	gracePeriodDays: 5,
	formattedDateGenerated: formatDate(new Date().toISOString())
}

const leaseTemplateSchema: LeaseTemplateSchema = {
	version: '2.0',
	sections: [
		{
			id: 'parties',
			title: 'Parties & Premises',
			description:
				'Identifies the parties entering into the agreement and the property covered by the lease.',
			clauses: [
				{
					id: 'parties-introduction',
					title: 'Lease Introduction',
					description:
						'Introduces the owner and tenant along with the effective date of the agreement.',
					tooltip:
						'This clause formally states who is entering into the lease and establishes the official name of the agreement.',
					defaultSelected: true,
					body: `<p>This Residential Lease Agreement ("Agreement") is entered into on {{formattedDateGenerated}} between <strong>{{ownerName}}</strong> ("owner") and <strong>{{tenantNames}}</strong> ("Tenant").</p>`
				},
				{
					id: 'property-description',
					title: 'Premises Description',
					description:
						'Describes the physical property and what is included in the lease.',
					tooltip:
						'Defines the exact property being rented to avoid disputes over what is included.',
					defaultSelected: true,
					body: `<p>The owner leases to the Tenant the residential premises located at <strong>{{propertyAddress}}</strong> (the "Premises") together with all improvements, fixtures, and appurtenances.</p>`
				},
				{
					id: 'occupancy-limit',
					title: 'Occupancy Limit',
					description:
						'Specifies who may reside at the premises and limits subletting.',
					tooltip:
						'Helps prevent unauthorized occupants and protects against overcrowding violations.',
					defaultSelected: true,
					body: `<p>Occupancy of the Premises is limited to the Tenant(s) named above and their immediate family. No other persons may reside at the Premises without the prior written consent of the owner.</p>`
				}
			]
		},
		{
			id: 'financial',
			title: 'Financial Terms',
			description:
				'Sets out the rent, deposits, fees, and payment schedules required under the lease.',
			clauses: [
				{
					id: 'rent-payment',
					title: 'Rent Payment Schedule',
					description: 'Defines rent amount, due date, and payment method.',
					tooltip:
						'Provides the legally enforceable rent obligations including grace periods and accepted payment methods.',
					defaultSelected: true,
					body: `<p>Tenant agrees to pay monthly rent of <strong>{{rentAmountFormatted}}</strong>, due on the <strong>{{rentDueDayOrdinal}}</strong> day of each month by 5:00 PM. Rent shall be paid via electronic transfer or other method approved by the owner.</p>`
				},
				{
					id: 'late-fee',
					title: 'Late Fees & Grace Period',
					description:
						'Explains when late fees apply and grace period duration.',
					tooltip:
						'Late fees must comply with state law; this clause sets enforceable rules to encourage timely payments.',
					defaultSelected: true,
					body: `<p>If rent is not received within {{gracePeriodDays}} days after the due date, a late fee of <strong>{{lateFeeAmountFormatted}}</strong> may be assessed. Continued non-payment may result in additional remedies permitted by law.</p>`
				},
				{
					id: 'security-deposit',
					title: 'Security Deposit',
					description: 'Details deposit amount and return conditions.',
					tooltip:
						'Security deposit rules are heavily regulated; this clause reflects the base requirement for most states.',
					defaultSelected: true,
					body: `<p>Tenant has paid a security deposit of <strong>{{securityDepositFormatted}}</strong> upon execution of this Agreement. The deposit shall be held to secure Tenant’s performance and will be returned less lawful deductions within the time period prescribed by {{stateName}} law.</p>`
				}
			]
		},
		{
			id: 'use-and-care',
			title: 'Use, Care & Maintenance',
			description:
				'Allocates maintenance responsibilities and establishes rules of conduct.',
			clauses: [
				{
					id: 'maintenance-responsibilities',
					title: 'Maintenance Responsibilities',
					description:
						'Outlines the responsibilities for upkeep and repairs for owner and tenant.',
					tooltip:
						'Clarifies who must handle routine maintenance and prevents disputes over repairs.',
					defaultSelected: true,
					body: `<p>Tenant shall maintain the Premises in a clean and sanitary condition and promptly notify owner of conditions requiring repair. owner will maintain major structural, plumbing, heating, and electrical systems in good working order.</p>`
				},
				{
					id: 'utilities',
					title: 'Utilities & Services',
					description:
						'Specifies who pays for utilities and services related to the property.',
					tooltip:
						'Important to clarify utility obligations up front to avoid billing disputes or service interruptions.',
					defaultSelected: true,
					body: `<p>The Tenant is responsible for all utilities and services supplied to the Premises, except where otherwise required by law. owner shall ensure utility services are active on the commencement date.</p>`
				},
				{
					id: 'owner-entry',
					title: 'owner Entry Rights',
					description:
						'Provides notice requirements and acceptable reasons for owner entry.',
					tooltip:
						'Most states mandate advance notice for non-emergency entry; this clause mirrors typical statutory requirements.',
					defaultSelected: true,
					body: `<p>owner may enter the Premises upon providing reasonable notice (at least 24 hours except in emergencies) for repairs, inspections, or to show the Premises to prospective tenants or buyers.</p>`
				}
			]
		},
		{
			id: 'policy',
			title: 'Policies & Rules',
			description: 'Covers pets, smoking, guests, and other house rules.',
			clauses: [
				{
					id: 'pet-policy',
					title: 'Pet Policy',
					description:
						'States whether pets are permitted and applicable terms.',
					tooltip:
						'Pet policies should be explicit to avoid unapproved animals and detail deposits or fees.',
					defaultSelected: true,
					body: `<p>Pets are permitted only with prior written consent of the owner. Approved pets may require an additional deposit or monthly fee as allowed by law. Service and assistance animals are accommodated in accordance with federal and state regulations.</p>`
				},
				{
					id: 'smoking-policy',
					title: 'Smoking Policy',
					description:
						'Sets restrictions on smoking within the property and common areas.',
					tooltip:
						'Clarifies smoking rules and provides grounds for addressing violations.',
					defaultSelected: false,
					body: `<p>Smoking, including vaping and electronic cigarettes, is not permitted inside the Premises. Designated outdoor areas may be used provided smoke does not infiltrate the building or disturb neighbors.</p>`
				},
				{
					id: 'guest-policy',
					title: 'Guest Policy',
					description:
						'Sets limits on guest stays to prevent unauthorized long-term occupants.',
					tooltip:
						'Helps differentiate between guests and unapproved occupants, protecting against subletting without consent.',
					defaultSelected: false,
					body: `<p>Guests staying more than 14 cumulative days in a calendar year must receive written approval from owner. Tenant remains fully responsible for guests’ conduct and compliance with this Agreement.</p>`
				}
			]
		},
		{
			id: 'compliance',
			title: 'Legal Compliance',
			description:
				'Addresses legal compliance, default remedies, and disclosure obligations.',
			clauses: [
				{
					id: 'default-remedies',
					title: 'Default & Remedies',
					description:
						'Explains what happens if tenant violates the lease or fails to pay rent.',
					tooltip:
						'Outlines the steps owner may take upon default and protects owner’s right to enforce the lease.',
					defaultSelected: true,
					body: `<p>Failure to pay rent or abide by this Agreement constitutes a default. owner may pursue all remedies permitted by {{stateName}} law, including termination and eviction, after providing any required notices.</p>`
				},
				{
					id: 'lead-paint-disclosure',
					title: 'Lead-Based Paint Disclosure',
					description:
						'Includes federally required information for properties built before 1978.',
					tooltip:
						'Federal law mandates disclosure for pre-1978 housing; include when applicable.',
					defaultSelected: false,
					requiresOption: 'includeFederalDisclosures',
					body: `<p><strong>Lead Warning Statement:</strong> Housing built before 1978 may contain lead-based paint. Exposure to lead dust or chips can cause health problems, especially in children and pregnant women. Tenant acknowledges receipt of the EPA pamphlet “Protect Your Family From Lead in Your Home.”</p>`
				},
				{
					id: 'state-specific-disclosures',
					title: 'State-Specific Disclosures',
					description:
						'Includes notices required under the selected state’s law.',
					tooltip:
						'Many states require specific language covering mold, bedbugs, flooding, and other hazards.',
					defaultSelected: true,
					requiresOption: 'includeStateDisclosures',
					body: `<p><strong>State Disclosures:</strong> The Tenant acknowledges the additional disclosures and acknowledgements required by {{stateName}} law, set forth in the attached addendum.</p>`
				}
			]
		}
	],
	stateRules: {
		CA: {
			state: 'CA',
			stateName: stateNames.CA,
			notices: [
				'California Civil Code §1950.5 limits residential security deposits to two months’ rent for unfurnished units.',
				'California requires a written disclosure if the property is within one mile of a former military base that handled munitions.',
				'Tenants in California must receive notice before pesticide application inside the unit.'
			],
			recommendedClauses: ['state-specific-disclosures', 'late-fee']
		},
		NY: {
			state: 'NY',
			stateName: stateNames.NY,
			notices: [
				'New York General Obligations Law limits late fees to $50 or 5% of monthly rent, whichever is less.',
				'Security deposits must be returned within 14 days of lease termination with an itemized receipt.',
				'Rent-stabilized units require additional rider disclosures under DHCR regulations.'
			],
			recommendedClauses: ['state-specific-disclosures']
		},
		IL: {
			state: 'IL',
			stateName: stateNames.IL,
			notices: [
				'Chicago Residential Property Owner and Tenant Ordinance imposes additional duties if the property is located within Chicago city limits.',
				'Security deposits must be held in a federally insured account in Illinois municipalities over 5,000 residents.',
				'Mold disclosure and pamphlet delivery are recommended for older multifamily properties.'
			],
			recommendedClauses: ['state-specific-disclosures']
		}
	} as Record<USState, LeaseTemplateStateRule>,
	federalNotices: [
		'The Fair Housing Act prohibits discrimination on the basis of race, color, religion, sex, familial status, national origin, or disability.',
		'Tenants are entitled to reasonable accommodations for disabilities under the Americans with Disabilities Act (ADA) and Section 504 of the Rehabilitation Act.'
	],
	glossary: {
		'Security Deposit':
			'Money held by the owner to cover unpaid rent or damage beyond normal wear and tear.',
		'Grace Period':
			'The number of days after the due date during which rent can be paid without triggering a late fee.',
		Premises:
			'The rental property, including fixtures and any areas granted for the tenant’s exclusive use.',
		Default:
			'A violation of a lease obligation that may give rise to eviction or other remedies.',
		'Notice to Enter':
			'Advance notice required before the owner may lawfully enter the rental unit.'
	}
}

function resolveToken(context: LeaseTemplateContext, token: string): string {
	const path = token.split('.')
	let current: unknown = context
	for (const segment of path) {
		if (
			current &&
			typeof current === 'object' &&
			segment in (current as Record<string, unknown>)
		) {
			current = (current as Record<string, unknown>)[segment]
		} else {
			return ''
		}
	}
	const value = current === null || current === undefined ? '' : String(current)
	// Escape HTML to prevent XSS attacks
	return escapeHtml(value)
}

function interpolate(template: string, context: LeaseTemplateContext) {
	return template.replace(/\{\{([^}]+)\}\}/g, (_, expression: string) => {
		const token = expression.trim()
		if (token === 'stateName') {
			return stateNames[context.propertyState] || context.propertyState
		}
		return resolveToken(context, token)
	})
}

function buildClauseHtml(
	clause: LeaseTemplateClause,
	context: LeaseTemplateContext
) {
	// Escape clause.id and clause.title to prevent XSS attacks
	return `<article data-clause="${escapeHtml(clause.id)}" class="lease-clause"><h3>${escapeHtml(clause.title)}</h3>${interpolate(clause.body, context)}</article>`
}

function renderCustomClauses(customClauses: CustomClause[] | undefined) {
	if (!customClauses?.length) return ''
	return customClauses
		.map(
			clause => `<article data-clause="${escapeHtml(clause.id)}" class="lease-clause">
	<h3>${escapeHtml(clause.title)}</h3>
	<p>${escapeHtml(clause.body)}</p>
</article>`
		)
		.join('')
}

function renderSection(
	section: LeaseTemplateSection,
	selections: LeaseTemplateSelections,
	context: LeaseTemplateContext
) {
	const included = section.clauses.filter(clause => {
		if (
			clause.stateLimitation &&
			!clause.stateLimitation.includes(selections.state)
		) {
			return false
		}
		if (
			clause.requiresOption === 'includeStateDisclosures' &&
			!selections.includeStateDisclosures
		) {
			return false
		}
		if (
			clause.requiresOption === 'includeFederalDisclosures' &&
			!selections.includeFederalDisclosures
		) {
			return false
		}
		return selections.selectedClauses.includes(clause.id)
	})

	if (!included.length) return ''

	const clausesHtml = included
		.map(clause => buildClauseHtml(clause, context))
		.join('')

	return `<section id="${section.id}" class="lease-section">
	<header class="lease-section-header">
		<h2>${section.title}</h2>
		<p>${section.description}</p>
	</header>
	${clausesHtml}
</section>`
}

function renderStateNotices(
	selections: LeaseTemplateSelections,
	schema: LeaseTemplateSchema
) {
	if (!selections.includeStateDisclosures) return ''
	const rules = schema.stateRules[selections.state]
	if (!rules || !rules.notices.length) return ''
	const noticeItems = rules.notices.map(notice => `<li>${notice}</li>`).join('')
	return `<section class="lease-section">
	<header class="lease-section-header">
		<h2>State Notices</h2>
		<p>Required disclosures and recommendations for ${rules.stateName}</p>
	</header>
	<ul class="legal-list">${noticeItems}</ul>
</section>`
}

function renderFederalNotices(schema: LeaseTemplateSchema) {
	if (!schema.federalNotices.length) return ''
	const list = schema.federalNotices
		.map(notice => `<li>${notice}</li>`)
		.join('')
	return `<section class="lease-section">
	<header class="lease-section-header">
		<h2>Federal Notices</h2>
		<p>Important federal disclosures that apply to residential leases</p>
	</header>
	<ul class="legal-list">${list}</ul>
</section>`
}

export function renderLeaseHtmlBody(
	schema: LeaseTemplateSchema,
	selections: LeaseTemplateSelections,
	context: LeaseTemplateContext
) {
	const sectionHtml = schema.sections
		.map(section => renderSection(section, selections, context))
		.join('')

	const customHtml = renderCustomClauses(selections.customClauses)
	const stateHtml = renderStateNotices(selections, schema)
	const federalHtml = selections.includeFederalDisclosures
		? renderFederalNotices(schema)
		: ''

	return `<div class="lease-document">
	<header class="lease-header">
		<h1>Residential Lease Agreement</h1>
		<p>
			This Agreement is made between <strong>${escapeHtml(context.ownerName)}</strong> ("owner") and <strong>${escapeHtml(context.tenantNames)}</strong> ("Tenant") concerning the premises at <strong>${escapeHtml(context.propertyAddress)}</strong>.
		</p>
	</header>
	${sectionHtml}
	${customHtml}
	${stateHtml}
	${federalHtml}
</div>`
}

export function renderLeaseHtmlDocument(
	schema: LeaseTemplateSchema,
	selections: LeaseTemplateSelections,
	context: LeaseTemplateContext
) {
	const body = renderLeaseHtmlBody(schema, selections, context)
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>Lease Agreement</title>
	<style>
		body {
			font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
			color: #1e293b;
			line-height: 1.6;
			margin: 0;
			padding: 32px;
			background: #f8fafc;
		}
		.lease-document {
			background: white;
			border-radius: 12px;
			padding: 40px;
			box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
			max-width: 900px;
			margin: 0 auto;
		}
		.lease-header {
			text-align: center;
			margin-bottom: 40px;
		}
		.lease-header h1 {
			font-size: 28px;
			margin-bottom: 8px;
			color: #0f172a;
		}
		.lease-section {
			margin-bottom: 36px;
			padding-bottom: 24px;
			border-bottom: 1px solid rgba(15, 23, 42, 0.08);
		}
		.lease-section:last-of-type {
			border-bottom: none;
		}
		.lease-section-header h2 {
			font-size: 20px;
			margin-bottom: 4px;
			color: #0f172a;
		}
		.lease-section-header p {
			margin: 0 0 16px;
			color: #475569;
			font-size: 15px;
		}
		.lease-clause {
			margin-bottom: 18px;
		}
		.lease-clause h3 {
			margin-bottom: 6px;
			font-size: 17px;
			color: #0f172a;
		}
		.lease-clause p {
			margin: 0;
			font-size: 15px;
		}
		.legal-list {
			padding-left: 18px;
		}
		.legal-list li {
			margin-bottom: 8px;
			font-size: 15px;
		}
	</style>
</head>
<body>
	${body}
</body>
</html>`
}

export function getDefaultSelections(
	schema: LeaseTemplateSchema,
	state: USState
): LeaseTemplateSelections {
	const selectedClauses = schema.sections.flatMap(section =>
		section.clauses
			.filter(clause => clause.defaultSelected)
			.map(clause => clause.id)
	)

	return {
		state,
		selectedClauses,
		includeStateDisclosures: true,
		includeFederalDisclosures: true,
		customClauses: []
	}
}

export function createDefaultContext(
	overrides?: Partial<LeaseTemplateContext>
) {
	return {
		...DEFAULT_CONTEXT,
		...overrides,
		rentAmountFormatted: formatCurrency(
			overrides?.rentAmountCents ?? DEFAULT_CONTEXT.rentAmountCents
		),
		securityDepositFormatted: formatCurrency(
			overrides?.securityDepositCents ?? DEFAULT_CONTEXT.securityDepositCents
		),
		rentDueDayOrdinal: formatOrdinal(
			overrides?.rentDueDay ?? DEFAULT_CONTEXT.rentDueDay
		),
		leaseStartDateFormatted: formatDate(
			overrides?.leaseStartDateISO ?? DEFAULT_CONTEXT.leaseStartDateISO
		),
		...(overrides?.leaseEndDateISO
			? { leaseEndDateFormatted: formatDate(overrides.leaseEndDateISO) }
			: {}),
		lateFeeAmountFormatted: formatCurrency(
			overrides?.lateFeeAmountCents ?? DEFAULT_CONTEXT.lateFeeAmountCents ?? 0
		)
	}
}

export function createContextFromLeaseData(
	leaseData: LeaseFormData
): LeaseTemplateContext {
	const tenantNames = leaseData.tenants.map(tenant => tenant.name).join('; ')
	const ownerAddress = `${leaseData.owner.address.street}, ${leaseData.owner.address.city}, ${leaseData.owner.address.state} ${leaseData.owner.address.zipCode}`
	const propertyAddress = `${leaseData.property.address.street}${
		leaseData.property.address.unit
			? `, ${leaseData.property.address.unit}`
			: ''
	}, ${leaseData.property.address.city}, ${leaseData.property.address.state} ${leaseData.property.address.zipCode}`

	const overrides: Partial<LeaseTemplateContext> = {
		ownerName: leaseData.owner.name,
		ownerAddress,
		tenantNames,
		propertyAddress,
		propertyState: leaseData.property.address.state,
		rentAmountCents: leaseData.leaseTerms.rentAmount,
		securityDepositCents: leaseData.leaseTerms.securityDeposit.amount,
		rentDueDay: leaseData.leaseTerms.dueDate,
		leaseStartDateISO: leaseData.leaseTerms.startDate,
		formattedDateGenerated: formatDate(new Date().toISOString())
	}

	if (leaseData.leaseTerms.endDate) {
		overrides.leaseEndDateISO = leaseData.leaseTerms.endDate
	}
	if (leaseData.leaseTerms.lateFee?.amount) {
		overrides.lateFeeAmountCents = leaseData.leaseTerms.lateFee.amount
	}
	if (leaseData.leaseTerms.lateFee?.gracePeriod) {
		overrides.gracePeriodDays = leaseData.leaseTerms.lateFee.gracePeriod
	}

	return createDefaultContext(overrides)
}

export { leaseTemplateSchema, stateNames }
