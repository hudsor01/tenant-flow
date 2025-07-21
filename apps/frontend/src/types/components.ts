// Component prop interfaces
import type React from 'react'
import type { Property } from './entities'

export interface StatCardProps {
	title: string
	value: string | number
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
	trend?: {
		value: number
		label: string
		isPositive: boolean
	}
}

// PropertyCardProps moved to component-props.ts for centralization
