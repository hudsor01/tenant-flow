'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import type { Property } from '@repo/shared'
import { PROPERTY_TYPE } from '@repo/shared'
import type { PropertyFormState } from '@/lib/actions/property-actions'

interface PropertyFormBasicInfoProps {
	property?: Property
	error?: string
}

const propertyTypes = [
	{ value: PROPERTY_TYPE.SINGLE_FAMILY, label: 'Single Family' },
	{ value: PROPERTY_TYPE.MULTI_UNIT, label: 'Multi Family' },
	{ value: PROPERTY_TYPE.APARTMENT, label: 'Apartment' },
	{ value: PROPERTY_TYPE.CONDO, label: 'Condo' },
	{ value: PROPERTY_TYPE.TOWNHOUSE, label: 'Townhouse' },
	{ value: PROPERTY_TYPE.COMMERCIAL, label: 'Commercial' },
	{ value: PROPERTY_TYPE.OTHER, label: 'Other' }
] as const

export function PropertyFormBasicInfo({
	property,
	error
}: PropertyFormBasicInfoProps) {
	return (
		<div className="space-y-6">
			{/* Property Name */}
			<div className="space-y-2">
				<Label htmlFor="name">Property Name *</Label>
				<Input
					id="name"
					name="name"
					defaultValue={property?.name || ''}
					placeholder="Enter property name"
					required
				/>
			</div>

			{/* Address */}
			<div className="space-y-2">
				<Label htmlFor="address">Address *</Label>
				<Textarea
					id="address"
					name="address"
					defaultValue={property?.address || ''}
					placeholder="Enter complete address"
					required
					rows={3}
				/>
			</div>

			{/* Property Type */}
			<div className="space-y-2">
				<Label htmlFor="type">Property Type *</Label>
				<Select
					name="propertyType"
					defaultValue={property?.propertyType || ''}
					required
				>
					<SelectTrigger>
						<SelectValue placeholder="Select property type" />
					</SelectTrigger>
					<SelectContent>
						{propertyTypes.map(type => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Number of Units */}
			<div className="space-y-2">
				<Label htmlFor="units">Number of Units *</Label>
				<Input
					id="units"
					name="units"
					type="number"
					min="1"
					defaultValue={property?.units?.length?.toString() || '1'}
					placeholder="Enter number of units"
					required
				/>
			</div>
		</div>
	)
}
