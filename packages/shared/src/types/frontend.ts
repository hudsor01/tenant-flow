/**
 * Frontend-specific types and interfaces
 *
 * Types used in frontend components and UI logic that need to be shared
 * across different parts of the application.
 */

// Component prop types
export interface ModernExplodedPieChartProps {
	data: Array<{ name: string; value: number; fill?: string }>
	height?: number
	className?: string
	title?: string
	description?: string
	showFooter?: boolean
}

export interface PaginationLinkProps extends React.ComponentProps<'a'> {
	page?: number
	currentPage?: number
	onPageChange?: ((page: number) => void) | ((page: number) => Promise<void>)
	isActive?: boolean
	size?: 'icon' | 'default' | 'sm' | 'lg'
}

// Tailwind theme types
export type TailwindColorName =
	| 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
	| 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
	| 'green' | 'emerald' | 'teal' | 'cyan' | 'sky'
	| 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
	| 'pink' | 'rose'

export type TailwindRadiusValue = 0 | 0.3 | 0.5 | 0.65 | 0.75 | 1.0
