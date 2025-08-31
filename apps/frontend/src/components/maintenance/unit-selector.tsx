'use client'

import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import type { Database } from '@repo/shared'
import { Home } from 'lucide-react'
// Define types directly from Database schema - NO DUPLICATION
type Unit = Database['public']['Tables']['Unit']['Row']

interface UnitWithProperty_ extends Unit {
	property: {
		id: string
		name: string
		address: string
		ownerId?: string
	}
}

interface UnitSelectorProps {
	units: UnitWithProperty_[]
	selectedUnitId?: string
	onValueChange: (_value: string) => void
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
			<Label htmlFor="unitId">Property_ & Unit</Label>
			<Select value={selectedUnitId} onValueChange={onValueChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select a property and unit" />
				</SelectTrigger>
				<SelectContent>
					{units.map(unit => (
						<SelectItem key={unit.id} value={unit.id}>
							<div className="flex items-center">
								<Home className=" mr-2 h-4 w-4"  />
								{unit.property?.name || 'Unknown Property_'} -
								Unit {unit.unitNumber}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	)
}
