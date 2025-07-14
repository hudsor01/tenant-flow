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

export interface PropertyCardProps {
	property: Property
	onEdit?: (property: Property) => void
	onDelete?: (property: Property) => void
}
