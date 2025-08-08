import type { UseFormReturn } from 'react-hook-form'
import { Home, Building } from 'lucide-react'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { FormSection } from '@/components/modals/base-form-modal'
import type { Unit } from '@repo/shared'
import type { PropertyWithDetails } from '@repo/shared'
import type { LeaseFormData } from '@/hooks/useLeaseForm'

interface UnitSelectionSectionProps {
	form: UseFormReturn<LeaseFormData>
	selectedProperty: PropertyWithDetails | undefined
	propertyUnits: Unit[]
	availableUnits: Unit[]
	hasUnits: boolean
	mode: 'create' | 'edit'
	existingLeaseUnitId?: string
}

/**
 * Unit selection section for lease forms
 * Handles unit selection logic with fallback for whole-property leases
 */
export function UnitSelectionSection({
	form,
	selectedProperty,
	propertyUnits,
	availableUnits,
	hasUnits,
	mode,
	existingLeaseUnitId
}: UnitSelectionSectionProps) {
	if (!selectedProperty) return null

	const unitsToShow =
		mode === 'edit'
			? propertyUnits.filter(
					unit =>
						unit.status === 'VACANT' ||
						unit.status === 'RESERVED' ||
						unit.id === existingLeaseUnitId
				)
			: availableUnits

	return (
		<FormSection icon={Home} title="2. Select Unit (Optional)" delay={1}>
			{!hasUnits ? (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<p className="text-green-800">
						<strong>{selectedProperty.name}</strong> doesn&apos;t have
						units defined. This lease will apply to the entire
						property.
					</p>
				</div>
			) : (
				<FormField
					control={form.control}
					name="unitId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Unit (Optional - leave blank for whole property
								lease)
							</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value || ''}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a specific unit or leave blank for whole property" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="">
										<div className="flex items-center space-x-2">
											<Building className="h-4 w-4" />
											<span>Whole Property Lease</span>
										</div>
									</SelectItem>
									{unitsToShow.map(unit => (
										<SelectItem
											key={unit.id}
											value={unit.id}
											className="p-3"
										>
											<div className="flex w-full items-center justify-between">
												<div className="flex items-center space-x-3">
													<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
														<Home className="h-4 w-4 text-gray-600" />
													</div>
													<div>
														<p className="font-medium">
															Unit{' '}
															{unit.unitNumber}
														</p>
														<p className="text-muted-foreground text-xs">
															{unit.bedrooms}BR •{' '}
															{unit.bathrooms}BA
															{unit.squareFeet &&
																` • ${unit.squareFeet} sq ft`}
														</p>
													</div>
												</div>
												<div className="text-right">
													<p className="font-semibold text-green-600">
														${unit.rent}
													</p>
													<p className="text-muted-foreground text-xs">
														per month
													</p>
												</div>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormDescription>
								{unitsToShow.length === 0 && hasUnits
									? 'No vacant units available'
									: 'Choose a specific unit or leave blank for a whole-property lease'}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
		</FormSection>
	)
}
