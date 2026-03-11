/* eslint-disable color-tokens/no-hex-colors -- test data for PDF generation, not UI colors */
import { describe, it, expect } from 'vitest'
import { buildTemplateHtml } from './build-template-html'
import type { TemplatePreviewOptions } from './template-types'

function makeOptions(
	overrides: Partial<TemplatePreviewOptions> = {}
): TemplatePreviewOptions {
	return {
		templateTitle: 'Lease Agreement',
		branding: {
			companyName: 'Acme Properties',
			logoUrl: null,
			primaryColor: '#336699'
		},
		customFields: [],
		clauses: [],
		data: {},
		...overrides
	}
}

describe('buildTemplateHtml', () => {
	it('returns a complete HTML document string with DOCTYPE, html, head, body tags', () => {
		const html = buildTemplateHtml(makeOptions())

		expect(html).toContain('<!DOCTYPE html>')
		expect(html).toContain('<html')
		expect(html).toContain('<head>')
		expect(html).toContain('</head>')
		expect(html).toContain('<body>')
		expect(html).toContain('</body>')
		expect(html).toContain('</html>')
	})

	it('includes templateTitle in an h1 element', () => {
		const html = buildTemplateHtml(
			makeOptions({ templateTitle: 'Monthly Inspection Report' })
		)

		expect(html).toContain('<h1')
		expect(html).toContain('Monthly Inspection Report')
	})

	it('includes branding companyName in the document', () => {
		const html = buildTemplateHtml(
			makeOptions({
				branding: {
					companyName: 'Sunset Realty LLC',
					logoUrl: null,
					primaryColor: '#333'
				}
			})
		)

		expect(html).toContain('Sunset Realty LLC')
	})

	it('includes branding primaryColor in inline styles', () => {
		const html = buildTemplateHtml(
			makeOptions({
				branding: {
					companyName: 'Test Co',
					logoUrl: null,
					primaryColor: '#ff5500'
				}
			})
		)

		expect(html).toContain('#ff5500')
	})

	it('renders each customField as label + value pair', () => {
		const html = buildTemplateHtml(
			makeOptions({
				customFields: [
					{ label: 'Pet Policy', value: 'Allowed with deposit' },
					{ label: 'Parking', value: 'Spot #42' }
				]
			})
		)

		expect(html).toContain('Pet Policy')
		expect(html).toContain('Allowed with deposit')
		expect(html).toContain('Parking')
		expect(html).toContain('Spot #42')
		expect(html).toContain('Additional Information')
	})

	it('renders each clause text in a numbered list', () => {
		const html = buildTemplateHtml(
			makeOptions({
				clauses: [
					{ id: '1', text: 'Tenant shall maintain the property.' },
					{ id: '2', text: 'Rent is due on the first of each month.' }
				]
			})
		)

		expect(html).toContain('Terms &amp; Conditions')
		expect(html).toContain('<ol')
		expect(html).toContain('Tenant shall maintain the property.')
		expect(html).toContain('Rent is due on the first of each month.')
		expect(html).toContain('<li')
	})

	it('renders data fields from the data record with nested objects as sections', () => {
		const html = buildTemplateHtml(
			makeOptions({
				data: {
					property: {
						name: 'Bayview Residences',
						unit: 'Unit 3A'
					},
					requester: {
						name: 'Sam Rivera',
						phone: '(510) 555-2200'
					}
				}
			})
		)

		expect(html).toContain('Property')
		expect(html).toContain('Bayview Residences')
		expect(html).toContain('Unit 3A')
		expect(html).toContain('Requester')
		expect(html).toContain('Sam Rivera')
		expect(html).toContain('(510) 555-2200')
	})

	it('renders primitive data fields as field rows', () => {
		const html = buildTemplateHtml(
			makeOptions({
				data: {
					status: 'Active',
					moveInDate: '2025-01-15'
				}
			})
		)

		expect(html).toContain('Status')
		expect(html).toContain('Active')
		expect(html).toContain('Move In Date')
		expect(html).toContain('2025-01-15')
	})

	it('handles empty customFields and clauses arrays gracefully', () => {
		const html = buildTemplateHtml(
			makeOptions({
				customFields: [],
				clauses: []
			})
		)

		expect(html).not.toContain('Additional Information')
		expect(html).not.toContain('Terms &amp; Conditions')
		expect(html).not.toContain('<ol')
	})

	it('escapes HTML special characters in user-provided text', () => {
		const html = buildTemplateHtml(
			makeOptions({
				templateTitle: '<script>alert("xss")</script>',
				branding: {
					companyName: '<img onerror="hack" src="">',
					logoUrl: null,
					primaryColor: '#000'
				},
				customFields: [
					{
						label: 'Notes & "comments"',
						value: "It's <bold>"
					}
				]
			})
		)

		expect(html).not.toContain('<script>')
		expect(html).not.toContain('alert("xss")')
		expect(html).toContain('&lt;script&gt;')
		expect(html).not.toContain('<img onerror')
		expect(html).toContain('&lt;img onerror=')
		expect(html).toContain('Notes &amp; &quot;comments&quot;')
		expect(html).toContain('It&#39;s &lt;bold&gt;')
	})

	it('includes state name when provided in options', () => {
		const html = buildTemplateHtml(
			makeOptions({
				state: 'California'
			})
		)

		expect(html).toContain('California')
	})

	it('does not render state when not provided', () => {
		const html = buildTemplateHtml(makeOptions())

		expect(html).not.toContain('undefined')
	})

	it('skips dynamicFields key from data record', () => {
		const html = buildTemplateHtml(
			makeOptions({
				data: {
					property: { name: 'Test Place' },
					dynamicFields: [
						{ label: 'Custom 1', value: 'Val 1' }
					]
				}
			})
		)

		expect(html).toContain('Test Place')
		expect(html).not.toContain('Dynamic Fields')
	})

	it('includes footer with company name and TenantFlow attribution', () => {
		const html = buildTemplateHtml(
			makeOptions({
				branding: {
					companyName: 'Summit Properties',
					logoUrl: null,
					primaryColor: '#000'
				}
			})
		)

		expect(html).toContain('Summit Properties')
		expect(html).toContain('TenantFlow')
		expect(html).toContain('footer')
	})
})
