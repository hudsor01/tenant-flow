/**
 * Type declarations for i18n-iso-countries
 * Package doesn't include TypeScript definitions
 */
declare module 'i18n-iso-countries' {
	export function registerLocale(locale: Record<string, unknown>): void
	export function getName(
		code: string,
		lang: string,
		options?: { select?: 'official' | 'alias' | 'all' }
	): string | undefined | string[]

	export function getAlpha3Code(name: string, lang: string): string | undefined
	export function getNames(
		lang: string,
		options?: { select?: 'official' | 'alias' | 'all' }
	): Record<string, string | string[]>
	export function isValid(code: string): boolean
}

declare module 'i18n-iso-countries/langs/en.json' {
	const locale: Record<string, unknown>
	export default locale
}
