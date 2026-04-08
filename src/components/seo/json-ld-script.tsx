import type { Thing, WithContext } from 'schema-dts'

/** Object-shaped schema types only (excludes string leaf variants from schema-dts) */
type ThingObject = Exclude<Thing, string>

interface JsonLdScriptProps {
	schema: ThingObject | WithContext<ThingObject>
}

/**
 * Type-safe JSON-LD script renderer with automatic @context wrapping and XSS escaping.
 * Centralizes the dangerouslySetInnerHTML pattern used across 8+ pages.
 *
 * Server Component -- no 'use client' directive needed.
 */
export function JsonLdScript({ schema }: JsonLdScriptProps) {
	const hasContext = '@context' in schema
	const jsonString = hasContext
		? JSON.stringify(schema)
		: JSON.stringify({ '@context': 'https://schema.org', ...Object.entries(schema).reduce<Record<string, unknown>>((acc, [k, v]) => { acc[k] = v; return acc }, {}) })

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: jsonString.replace(/</g, '\\u003c')
			}}
		/>
	)
}
