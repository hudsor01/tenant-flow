import type { UseFormReturn } from 'react-hook-form'
import { Building } from 'lucide-react'
import {
	FormControl,
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
import { FormSection } from '@/components/modals/BaseFormModal'
import type { Property } from '@repo/shared'
import type { LeaseFormData } from '@/hooks/useLeaseForm'

interface PropertySelectionSectionProps {
	form: UseFormReturn<LeaseFormData>
	properties: Property[]
}

/**
 * Property selection section for lease forms
 * Displays available properties in an organized dropdown
 */
export function PropertySelectionSection({
	form,
	properties
}: PropertySelectionSectionProps) {
	return (
		<FormSection icon={Building} title="1. Select Property" delay={0}>
			<FormField
				control={form.control}
				name="propertyId"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Property *</FormLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
						>
							<FormControl>
								<SelectTrigger className="h-16">
									<SelectValue placeholder="Choose a property for this lease" />
								</SelectTrigger>
							</FormControl>
							<SelectContent className="max-h-60">
								{properties.map(property => (
									<SelectItem
										key={property.id}
										value={property.id}
										className="p-3"
									>
										<div className="flex items-center space-x-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
												<Building className="h-5 w-5 text-blue-600" />
											</div>
											<div>
												<p className="font-medium">
													{property.name}
												</p>
												<p className="text-muted-foreground text-sm">
													{property.address},{' '}
													{property.city},{' '}
													{property.state}
												</p>
												<p className="text-muted-foreground text-xs">
													{property.description ||
														'Property'}
												</p>
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
		</FormSection>
	)
}
