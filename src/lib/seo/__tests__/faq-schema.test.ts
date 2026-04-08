import { describe, expect, it } from 'vitest'

import { createFaqJsonLd } from '../faq-schema'

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

describe('createFaqJsonLd', () => {
	const sampleItems = [
		{ question: 'What is TenantFlow?', answer: 'Property management software.' },
		{ question: 'How much does it cost?', answer: 'Free plan available.' }
	]

	it('returns object with @type FAQPage', () => {
		const result = toPlain(createFaqJsonLd(sampleItems))
		expect(result['@type']).toBe('FAQPage')
	})

	it('mainEntity array has correct length', () => {
		const result = toPlain(createFaqJsonLd(sampleItems))
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>
		expect(mainEntity).toHaveLength(2)
	})

	it('each item is @type Question with acceptedAnswer of @type Answer', () => {
		const result = toPlain(createFaqJsonLd(sampleItems))
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>

		for (const item of mainEntity) {
			expect(item['@type']).toBe('Question')
			const answer = item.acceptedAnswer as Record<string, unknown>
			expect(answer['@type']).toBe('Answer')
		}
	})

	it('question and answer text match inputs exactly', () => {
		const result = toPlain(createFaqJsonLd(sampleItems))
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>

		expect(mainEntity[0]?.name).toBe('What is TenantFlow?')
		const firstAnswer = mainEntity[0]?.acceptedAnswer as Record<string, unknown>
		expect(firstAnswer.text).toBe('Property management software.')

		expect(mainEntity[1]?.name).toBe('How much does it cost?')
		const secondAnswer = mainEntity[1]?.acceptedAnswer as Record<string, unknown>
		expect(secondAnswer.text).toBe('Free plan available.')
	})

	it('empty array returns FAQPage with empty mainEntity', () => {
		const result = toPlain(createFaqJsonLd([]))
		expect(result['@type']).toBe('FAQPage')
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>
		expect(mainEntity).toHaveLength(0)
	})
})
