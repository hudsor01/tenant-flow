'use client'

import { SectionCards } from '#app/(protected)/manage/SectionCards'

/**
 * MetricsSection - Single Responsibility: Display key metrics cards
 *
 * SectionCards handles its own data fetching and loading states
 */
export function MetricsSection() {
	return (
		<div
			className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
		>
			<div className="mx-auto max-w-400 py-4">
				<SectionCards />
			</div>
		</div>
	)
}
