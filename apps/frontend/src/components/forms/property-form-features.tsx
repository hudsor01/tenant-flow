'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X } from 'lucide-react'
import type { Property } from '@repo/shared'
import type { PropertyFormState } from '@/lib/actions/property-actions'

interface PropertyFormFeaturesProps {
	property?: Property
	error?: string
	onAmenitiesChange?: (amenities: string[]) => void
}

interface AmenityTagProps {
	amenity: string
	onRemove: () => void
}

function AmenityTag({ amenity, onRemove }: AmenityTagProps) {
	return (
		<div className="bg-secondary flex items-center gap-1 rounded-full px-3 py-1 text-sm">
			<span>{amenity}</span>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="h-4 w-4 p-0 hover:bg-transparent"
				onClick={onRemove}
				aria-label={`Remove ${amenity} amenity`}
			>
				<X className="h-3 w-3" />
			</Button>
		</div>
	)
}

interface AmenityInputProps {
	value: string
	onChange: (_value: string) => void
	onAdd: () => void
}

function AmenityInput({ value, onChange, onAdd }: AmenityInputProps) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			onAdd()
		}
	}

	return (
		<div className="flex gap-2">
			<Input
				value={value}
				onChange={e => onChange(e.target.value)}
				placeholder="Add an amenity"
				onKeyDown={handleKeyDown}
			/>
			<Button type="button" onClick={onAdd} size="icon" variant="outline">
				<Plus className="h-4 w-4" />
				<span className="sr-only">Add amenity</span>
			</Button>
		</div>
	)
}

export function PropertyFormFeatures({
	property,
	error,
	onAmenitiesChange
}: PropertyFormFeaturesProps) {
	const [amenities, setAmenities] = useState<string[]>([])
	const [newAmenity, setNewAmenity] = useState('')

	const addAmenity = () => {
		const trimmedAmenity = newAmenity.trim()
		if (trimmedAmenity && !amenities.includes(trimmedAmenity)) {
			const updatedAmenities = [...amenities, trimmedAmenity]
			setAmenities(updatedAmenities)
			setNewAmenity('')
			onAmenitiesChange?.(updatedAmenities)
		}
	}

	const removeAmenity = (index: number) => {
		const updatedAmenities = amenities.filter((_, i) => i !== index)
		setAmenities(updatedAmenities)
		onAmenitiesChange?.(updatedAmenities)
	}

	return (
		<div className="space-y-6">
			{/* Description */}
			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					name="description"
					defaultValue={property?.description || ''}
					placeholder="Describe the property (optional)"
					rows={4}
					className={error ? 'border-destructive' : ''}
				/>
				{error && <p className="text-destructive text-sm">{error}</p>}
			</div>

			{/* Amenities */}
			<div className="space-y-4">
				<Label>Amenities</Label>

				<AmenityInput
					value={newAmenity}
					onChange={setNewAmenity}
					onAdd={addAmenity}
				/>

				{amenities.length > 0 && (
					<div className="space-y-2">
						<p className="text-muted-foreground text-sm">
							{amenities.length} amenities added
						</p>
						<div className="flex flex-wrap gap-2">
							{amenities.map((amenity, index) => (
								<AmenityTag
									key={index}
									amenity={amenity}
									onRemove={() => removeAmenity(index)}
								/>
							))}
						</div>
					</div>
				)}

				{amenities.length === 0 && (
					<p className="text-muted-foreground text-sm">
						No amenities added yet. Add features like "Pool", "Gym",
						"Parking" etc.
					</p>
				)}
			</div>
		</div>
	)
}
