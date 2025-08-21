/**
 * Date formatting utilities
 */

/**
 * Helper function to format article date
 */
export function formatArticleDate(date: string | Date): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

/**
 * Helper function to calculate estimated read time
 */
export function calculateReadTime(content: string): number {
	const wordsPerMinute = 200
	const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
	return Math.ceil(words / wordsPerMinute)
}

/**
 * Helper function to generate article excerpt
 */
export function generateExcerpt(content: string, maxLength = 160): string {
	const text = content.replace(/<[^>]*>/g, '').trim()
	if (text.length <= maxLength) return text

	const truncated = text.substring(0, maxLength)
	const lastSpace = truncated.lastIndexOf(' ')

	return lastSpace > 0
		? truncated.substring(0, lastSpace) + '...'
		: truncated + '...'
}