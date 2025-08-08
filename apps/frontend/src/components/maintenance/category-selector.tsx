'use client'

import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { MAINTENANCE_CATEGORY } from '@repo/shared'
import type { MaintenanceCategory } from '@repo/shared'

interface CategorySelectorProps {
	value?: MaintenanceCategory
	onValueChange: (value: MaintenanceCategory) => void
	error?: string
}

export function CategorySelector({ 
	value, 
	onValueChange, 
	error 
}: CategorySelectorProps) {
	const getCategoryIcon = (category: string) => {
		switch (category) {
			case 'GENERAL': return '📋'
			case 'PLUMBING': return '🚰'
			case 'ELECTRICAL': return '⚡'
			case 'HVAC': return '❄️'
			case 'APPLIANCES': return '🏠'
			case 'SAFETY': return '🔒'
			case 'OTHER': return '📝'
			default: return '📝'
		}
	}

	const getCategoryLabel = (category: string) => {
		switch (category) {
			case 'GENERAL': return 'General Maintenance'
			case 'PLUMBING': return 'Plumbing'
			case 'ELECTRICAL': return 'Electrical'
			case 'HVAC': return 'HVAC'
			case 'APPLIANCES': return 'Appliances'
			case 'SAFETY': return 'Safety & Security'
			case 'OTHER': return 'Other'
			default: return 'Other'
		}
	}

	return (
		<div className="space-y-2">
			<Label htmlFor="category">Category</Label>
			<Select
				value={value}
				onValueChange={onValueChange}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select category" />
				</SelectTrigger>
				<SelectContent>
					{Object.entries(MAINTENANCE_CATEGORY).map(([key, categoryValue]) => (
						<SelectItem key={key} value={categoryValue}>
							{getCategoryIcon(categoryValue)} {getCategoryLabel(categoryValue)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && (
				<p className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	)
}