import type { BreadcrumbList, ListItem } from 'schema-dts'

import { getSiteUrl } from '#lib/generate-metadata'

/**
 * Create a BreadcrumbList JSON-LD schema from a route path.
 * @param path - The route path (e.g., '/blog/my-post')
 * @param overrides - Optional map of path segments to display labels (e.g., \{ 'my-post': 'My Blog Post' \})
 */
export function createBreadcrumbJsonLd(
	path: string,
	overrides?: Record<string, string>
): BreadcrumbList {
	const siteUrl = getSiteUrl()
	const segments = path.split('/').filter(Boolean)

	const items: ListItem[] = [
		{
			'@type': 'ListItem' as const,
			position: 1,
			name: 'Home',
			item: siteUrl
		}
	]

	let currentPath = ''
	segments.forEach((segment, index) => {
		currentPath += `/${segment}`
		const isLast = index === segments.length - 1
		const name = overrides?.[segment] ?? formatSegment(segment)

		const listItem: ListItem = {
			'@type': 'ListItem' as const,
			position: index + 2,
			name,
			...(isLast ? {} : { item: `${siteUrl}${currentPath}` })
		}
		items.push(listItem)
	})

	return {
		'@type': 'BreadcrumbList' as const,
		itemListElement: items
	}
}

/** Capitalize first letter of each word and replace hyphens with spaces */
function formatSegment(segment: string): string {
	return segment
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
