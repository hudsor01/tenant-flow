import type { Thing, WithContext } from 'schema-dts'

interface JsonLdScriptProps<T extends Thing> {
	schema: T | WithContext<T>
}

/**
 * Type-safe JSON-LD script renderer with automatic @context wrapping and XSS escaping.
 * Centralizes the dangerouslySetInnerHTML pattern used across 8+ pages.
 *
 * Server Component -- no 'use client' directive needed.
 */
export function JsonLdScript<T extends Thing>({ schema }: JsonLdScriptProps<T>) {
	const withContext =
		'@context' in schema
			? schema
			: { '@context': 'https://schema.org' as const, ...schema }

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(withContext).replace(/</g, '\\u003c')
			}}
		/>
	)
}
