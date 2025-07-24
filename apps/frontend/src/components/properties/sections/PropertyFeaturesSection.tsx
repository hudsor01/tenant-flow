import { Home, Car, Waves } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/modals/BaseFormModal'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormData } from '@/hooks/usePropertyFormData'

interface PropertyFeaturesSectionProps {
	form: UseFormReturn<PropertyFormData>
}

/**
 * Property features section component
 * Handles amenities and property features (only shown in edit mode)
 */
export function PropertyFeaturesSection({
	form
}: PropertyFeaturesSectionProps) {
	return (
		<FormSection icon={Home} title="Property Features" delay={2}>
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
				<p className="mb-4 text-sm text-gray-600">
					Select the amenities and features available at this
					property:
				</p>

				<div className="space-y-3">
					{/* Garage */}
					<div className="flex items-center space-x-3">
						<input
							type="checkbox"
							id="hasGarage"
							className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							{...form.register('hasGarage')}
						/>
						<div className="flex items-center space-x-2">
							<Car className="h-4 w-4 text-gray-600" />
							<Label
								htmlFor="hasGarage"
								className="cursor-pointer text-sm text-gray-700"
							>
								Garage or Covered Parking
							</Label>
						</div>
					</div>

					{/* Pool */}
					<div className="flex items-center space-x-3">
						<input
							type="checkbox"
							id="hasPool"
							className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							{...form.register('hasPool')}
						/>
						<div className="flex items-center space-x-2">
							<Waves className="h-4 w-4 text-gray-600" />
							<Label
								htmlFor="hasPool"
								className="cursor-pointer text-sm text-gray-700"
							>
								Swimming Pool
							</Label>
						</div>
					</div>
				</div>

				<p className="mt-4 text-xs text-gray-500">
					💡 These features will be displayed on lease documents and
					tenant portals.
				</p>
			</div>
		</FormSection>
	)
}
