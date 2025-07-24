import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/modals/BaseFormModal'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormData } from '@/hooks/usePropertyFormData'

interface PropertyLocationSectionProps {
	form: UseFormReturn<PropertyFormData>
}

/**
 * Property location section component
 * Handles address, city, state, and ZIP code fields
 */
export function PropertyLocationSection({
	form
}: PropertyLocationSectionProps) {
	return (
		<FormSection icon={MapPin} title="Location" delay={1}>
			{/* Street Address */}
			<div className="space-y-2">
				<Label
					htmlFor="address"
					className="text-sm font-medium text-gray-700"
				>
					Street Address *
				</Label>
				<div className="relative">
					<MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
					<Input
						id="address"
						placeholder="e.g., 123 Main Street"
						className="pl-10 transition-colors focus:border-blue-500"
						{...form.register('address')}
					/>
				</div>
				{form.formState.errors.address && (
					<p className="text-sm text-red-600">
						{form.formState.errors.address.message}
					</p>
				)}
			</div>

			{/* City, State, ZIP Grid */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{/* City */}
				<div className="space-y-2">
					<Label
						htmlFor="city"
						className="text-sm font-medium text-gray-700"
					>
						City *
					</Label>
					<Input
						id="city"
						placeholder="e.g., San Francisco"
						className="transition-colors focus:border-blue-500"
						{...form.register('city')}
					/>
					{form.formState.errors.city && (
						<p className="text-sm text-red-600">
							{form.formState.errors.city.message}
						</p>
					)}
				</div>

				{/* State */}
				<div className="space-y-2">
					<Label
						htmlFor="state"
						className="text-sm font-medium text-gray-700"
					>
						State *
					</Label>
					<Input
						id="state"
						placeholder="e.g., California"
						className="transition-colors focus:border-blue-500"
						{...form.register('state')}
					/>
					{form.formState.errors.state && (
						<p className="text-sm text-red-600">
							{form.formState.errors.state.message}
						</p>
					)}
				</div>

				{/* ZIP Code */}
				<div className="space-y-2">
					<Label
						htmlFor="zipCode"
						className="text-sm font-medium text-gray-700"
					>
						ZIP Code *
					</Label>
					<Input
						id="zipCode"
						placeholder="e.g., 94102"
						className="transition-colors focus:border-blue-500"
						{...form.register('zipCode')}
					/>
					{form.formState.errors.zipCode && (
						<p className="text-sm text-red-600">
							{form.formState.errors.zipCode.message}
						</p>
					)}
				</div>
			</div>

			<p className="text-xs text-gray-500">
				📍 This address will be used for lease documents and tenant
				communications.
			</p>
		</FormSection>
	)
}
