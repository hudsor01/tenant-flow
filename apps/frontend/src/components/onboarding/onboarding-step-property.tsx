'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useCreatePropertyMutation } from '#hooks/api/use-properties'
import type { PropertyCreate } from '@repo/shared/validation/properties'

interface OnboardingStepPropertyProps {
	onNext: () => void
	onSkip: () => void
}

const PROPERTY_TYPES = [
	{ value: 'SINGLE_FAMILY', label: 'Single Family' },
	{ value: 'MULTI_UNIT', label: 'Multi Unit' },
	{ value: 'APARTMENT', label: 'Apartment' },
	{ value: 'CONDO', label: 'Condo' },
	{ value: 'TOWNHOUSE', label: 'Townhouse' },
	{ value: 'COMMERCIAL', label: 'Commercial' },
	{ value: 'OTHER', label: 'Other' }
] as const

type PropertyTypeValue = typeof PROPERTY_TYPES[number]['value']

/**
 * Property step - simplified property creation form in the onboarding wizard
 */
export function OnboardingStepProperty({
	onNext,
	onSkip
}: OnboardingStepPropertyProps) {
	const createProperty = useCreatePropertyMutation()

	const [name, setName] = useState('')
	const [addressLine1, setAddressLine1] = useState('')
	const [city, setCity] = useState('')
	const [state, setState] = useState('')
	const [postalCode, setPostalCode] = useState('')
	const [propertyType, setPropertyType] = useState<PropertyTypeValue>('SINGLE_FAMILY')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!name.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
			return
		}

		const propertyData: PropertyCreate = {
			name: name.trim(),
			address_line1: addressLine1.trim(),
			city: city.trim(),
			state: state.trim().toUpperCase(),
			postal_code: postalCode.trim(),
			country: 'US',
			property_type: propertyType,
			status: 'active'
		}

		createProperty.mutate(propertyData, {
			onSuccess: () => {
				onNext()
			}
		})
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
					<Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
				</div>
				<div>
					<h3 className="font-semibold">Add Your First Property</h3>
					<p className="text-sm text-muted-foreground">
						Enter basic details to get started.
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-3">
				<div className="space-y-1.5">
					<Label htmlFor="onboarding-property-name">Property Name</Label>
					<Input
						id="onboarding-property-name"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="e.g. Maple Street House"
						required
						className="h-11"
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="onboarding-property-type">Property Type</Label>
					<Select
						value={propertyType}
						onValueChange={val => setPropertyType(val as PropertyTypeValue)}
					>
						<SelectTrigger id="onboarding-property-type" className="h-11">
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							{PROPERTY_TYPES.map(type => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="onboarding-property-address">Street Address</Label>
					<Input
						id="onboarding-property-address"
						value={addressLine1}
						onChange={e => setAddressLine1(e.target.value)}
						placeholder="e.g. 123 Maple Street"
						required
						className="h-11"
					/>
				</div>

				<div className="grid grid-cols-3 gap-3">
					<div className="col-span-1 space-y-1.5">
						<Label htmlFor="onboarding-property-city">City</Label>
						<Input
							id="onboarding-property-city"
							value={city}
							onChange={e => setCity(e.target.value)}
							placeholder="Austin"
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="onboarding-property-state">State</Label>
						<Input
							id="onboarding-property-state"
							value={state}
							onChange={e => setState(e.target.value)}
							placeholder="TX"
							maxLength={2}
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="onboarding-property-zip">ZIP</Label>
						<Input
							id="onboarding-property-zip"
							value={postalCode}
							onChange={e => setPostalCode(e.target.value)}
							placeholder="78701"
							maxLength={10}
							required
							className="h-11"
						/>
					</div>
				</div>

				<div className="flex gap-2 pt-2">
					<Button
						type="submit"
						disabled={createProperty.isPending}
						className="min-h-11 flex-1"
					>
						{createProperty.isPending ? 'Saving...' : 'Add Property'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onSkip}
						className="min-h-11"
					>
						Skip
					</Button>
				</div>
			</form>
		</div>
	)
}
