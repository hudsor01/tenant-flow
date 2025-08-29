import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/modals/base-form-modal'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormData } from '@repo/shared/validation'

interface Property_FeaturesSectionProps {
  form: UseFormReturn<PropertyFormData>
}

/**
 * Property_ features section component
 * Handles amenities and property features (only shown in edit mode)
 */
export function Property_FeaturesSection({
	form
}: Property_FeaturesSectionProps) {
	return (
		<FormSection icon="Property_ Features" title="Property_ Features" delay={2}>
			<div className="rounded-lg border border-gray-2 bg-gray-50 p-4">
				<p className="mb-4 text-sm text-gray-6">
					Select the amenities and features available at this
					property:
				</p>

				<div className="space-y-3">
					{/* Garage */}
					<div className="flex items-center space-x-3">
						<input
							type="checkbox"
							id="hasGarage"
							className="text-primary focus:ring-primary rounded border-gray-3"
							{...form.register('hasGarage')}
						/>
						<div className="flex items-center space-x-2">
							<i className="i-lucide-car h-4 w-4 text-gray-6"  />
							<Label
								htmlFor="hasGarage"
								className="cursor-pointer text-sm text-gray-7"
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
							className="text-primary focus:ring-primary rounded border-gray-3"
							{...form.register('hasPool')}
						/>
						<div className="flex items-center space-x-2">
							<i className="i-lucide-waves h-4 w-4 text-gray-6"  />
							<Label
								htmlFor="hasPool"
								className="cursor-pointer text-sm text-gray-7"
							>
								Swimming Pool
							</Label>
						</div>
					</div>
				</div>

				<p className="mt-4 text-xs text-gray-5">
					💡 These features will be displayed on lease documents and
					tenant portals.
				</p>
			</div>
		</FormSection>
	)
}
