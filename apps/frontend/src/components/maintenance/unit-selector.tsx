'use client'

import { Home } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import type { Unit } from '@repo/shared'

interface UnitWithProperty extends Unit {
	property: {
		id: string
		name: string
		address: string
		ownerId?: string
	}
}

interface UnitSelectorProps {
	units: UnitWithProperty[]
	selectedUnitId?: string
	onValueChange: (value: string) => void
	error?: string
}

export function UnitSelector({ 
	units, 
	selectedUnitId, 
	onValueChange, 
	error 
}: UnitSelectorProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="unitId">Property & Unit</Label>
			<Select
				value={selectedUnitId}
				onValueChange={onValueChange}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select a property and unit" />
				</SelectTrigger>
				<SelectContent>
					{units.map((unit) => (
						<SelectItem key={unit.id} value={unit.id}>
							<div className="flex items-center">
								<Home className="mr-2 h-4 w-4" />
								{unit.property?.name || 'Unknown Property'}{' '}
								- Unit {unit.unitNumber}
							</div>
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