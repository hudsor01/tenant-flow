import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JsonLdScript } from '../json-ld-script'

function getJsonLdContent(container: HTMLElement): string {
	const script = container.querySelector('script[type="application/ld+json"]')
	return script?.textContent ?? ''
}

function parseJsonLd(container: HTMLElement): Record<string, unknown> {
	const content = getJsonLdContent(container)
	// Unescape \u003c back to < for JSON parsing
	return JSON.parse(content.replace(/\\u003c/g, '<')) as Record<string, unknown>
}

describe('JsonLdScript', () => {
	it('renders a script tag with type="application/ld+json"', () => {
		const { container } = render(
			<JsonLdScript schema={{ '@type': 'Organization', name: 'Test' }} />
		)

		const script = container.querySelector('script[type="application/ld+json"]')
		expect(script).not.toBeNull()
	})

	it('JSON output contains @context: https://schema.org', () => {
		const { container } = render(
			<JsonLdScript schema={{ '@type': 'Organization', name: 'Test' }} />
		)

		const parsed = parseJsonLd(container)
		expect(parsed['@context']).toBe('https://schema.org')
	})

	it('XSS-escapes angle brackets in output', () => {
		const { container } = render(
			<JsonLdScript
				schema={{
					'@type': 'Organization',
					name: '<script>alert("xss")</script>'
				}}
			/>
		)

		const rawContent = getJsonLdContent(container)
		expect(rawContent).not.toContain('<script>')
		expect(rawContent).toContain('\\u003c')
	})

	it('accepts a schema-dts typed object and serializes it correctly', () => {
		const { container } = render(
			<JsonLdScript
				schema={{
					'@type': 'Organization',
					name: 'TenantFlow',
					url: 'https://tenantflow.app'
				}}
			/>
		)

		const parsed = parseJsonLd(container)
		expect(parsed['@type']).toBe('Organization')
		expect(parsed.name).toBe('TenantFlow')
		expect(parsed.url).toBe('https://tenantflow.app')
	})

	it('handles schema objects that already have @context (does not double-wrap)', () => {
		const { container } = render(
			<JsonLdScript
				schema={{
					'@context': 'https://schema.org',
					'@type': 'Thing',
					name: 'Existing Context'
				}}
			/>
		)

		const parsed = parseJsonLd(container)
		expect(parsed['@context']).toBe('https://schema.org')

		// Verify only one @context key exists (JSON.parse deduplicates, so check raw content)
		const rawContent = getJsonLdContent(container)
		const contextMatches = rawContent.match(/@context/g)
		expect(contextMatches).toHaveLength(1)
	})
})
