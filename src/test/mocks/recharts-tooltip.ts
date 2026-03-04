/**
 * Recharts tooltip type mock for Vitest tests
 */
import type { ReactNode } from 'react'

export interface DefaultTooltipContentProps {
	active?: boolean
	payload?: Array<{
		name: string
		value: number | string
		color?: string
		dataKey?: string
	}>
	label?: string
}

export const DefaultTooltipContent = (_props: DefaultTooltipContentProps): ReactNode => null

export default DefaultTooltipContent
