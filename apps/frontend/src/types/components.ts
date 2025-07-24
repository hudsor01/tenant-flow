// Component prop interfaces
import type React from 'react'

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
