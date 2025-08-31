import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/modals/base-form-modal'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormData } from '@repo/shared/validation'
import { MapPin } from 'lucide-react'
interface Property_LocationSectionProps {
  form: UseFormReturn<PropertyFormData>
}

/**
 * Property_ location section component
 * Handles address, city, state, and ZIP code fields
 */
export function Property_LocationSection({
	form
}: Readonly<Property_LocationSectionProps>) {
	return (
		<FormSection icon="Location" title="Location" delay={1}>
			{/* Street Address */}
			<div className="space-y-2">
				<Label
					htmlFor="address"
					className="text-sm font-medium text-gray-700"
				>
					Street Address *
				</Label>
				<div className="relative">
					<MapPin className=" absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400"  />
					<Input
						id="address"
						placeholder="e.g., 123 Main Street"
						className="focus:border-primary pl-10 transition-colors"
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
						className="focus:border-primary transition-colors"
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
						className="focus:border-primary transition-colors"
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
						className="focus:border-primary transition-colors"
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
