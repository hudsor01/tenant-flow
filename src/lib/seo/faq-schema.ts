import type { FAQPage } from 'schema-dts'

interface FaqItem {
	question: string
	answer: string
}

/**
 * Create a FAQPage JSON-LD schema from question/answer pairs.
 * Produces schema-dts typed output for use with JsonLdScript component.
 */
export function createFaqJsonLd(items: FaqItem[]): FAQPage {
	return {
		'@type': 'FAQPage',
		mainEntity: items.map(item => ({
			'@type': 'Question' as const,
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer' as const,
				text: item.answer
			}
		}))
	}
}
