import { createParser } from 'nuqs/server'
import { z } from 'zod'

import type { ExtendedColumnSort } from '#types/data-table'

const sortingItemSchema = z.object({
	id: z.string(),
	desc: z.boolean()
})

/**
 * Creates a nuqs parser for table sorting state
 *
 * @param columnIds - Optional list of valid column IDs to validate against
 * @returns Parser that serializes/deserializes sorting state to/from URL
 *
 * @example
 * const sortingParser = getSortingStateParser(['name', 'date'])
 * // URL: ?sort=[{"id":"name","desc":true}]
 */
export const getSortingStateParser = <TData>(
	columnIds?: string[] | Set<string>
) => {
	const validKeys = columnIds
		? columnIds instanceof Set
			? columnIds
			: new Set(columnIds)
		: null

	return createParser({
		parse: value => {
			try {
				const parsed = JSON.parse(value)
				const result = z.array(sortingItemSchema).safeParse(parsed)

				if (!result.success) return null

				if (validKeys && result.data.some(item => !validKeys.has(item.id))) {
					return null
				}

				return result.data as ExtendedColumnSort<TData>[]
			} catch {
				return null
			}
		},
		serialize: value => JSON.stringify(value),
		eq: (a, b) =>
			a.length === b.length &&
			a.every(
				(item, index) =>
					item.id === b[index]?.id && item.desc === b[index]?.desc
			)
	})
}
