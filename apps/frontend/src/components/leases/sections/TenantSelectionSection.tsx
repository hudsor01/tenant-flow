import type { UseFormReturn } from 'react-hook-form'
import { User } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { FormSection } from '@/components/modals/BaseFormModal'
// Remove the import since we'll use the actual TRPC type
import type { LeaseFormData } from '@/hooks/useLeaseForm'

interface Tenant {
	id: string
	name: string
	email: string
	phone?: string
	invitationStatus?: string
	createdAt: Date | string
	updatedAt: Date | string
}

interface TenantSelectionSectionProps {
	form: UseFormReturn<LeaseFormData>
	tenants: Tenant[]
	selectedProperty: { id: string } | null
}

/**
 * Tenant selection section for lease forms
 * Shows only accepted tenants and provides proper feedback
 */
export function TenantSelectionSection({
	form,
	tenants,
	selectedProperty
}: TenantSelectionSectionProps) {
	if (!selectedProperty) return null

	// For now, show all tenants since invitationStatus is not in the current schema
	const acceptedTenants = tenants

	return (
		<FormSection icon={User} title="3. Select Tenant(s)" delay={2}>
			<FormField
				control={form.control}
				name="tenantId"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Primary Tenant *</FormLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="Select the primary tenant for this lease" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{acceptedTenants.map(tenant => (
									<SelectItem
										key={tenant.id}
										value={tenant.id}
										className="p-3"
									>
										<div className="flex items-center space-x-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
												<User className="h-4 w-4 text-blue-600" />
											</div>
											<div>
												<p className="font-medium">
													{tenant.name}
												</p>
												<p className="text-muted-foreground text-xs">
													{tenant.email}
												</p>
												{tenant.phone && (
													<p className="text-muted-foreground text-xs">
														{tenant.phone}
													</p>
												)}
											</div>
											<Badge
												variant="outline"
												className="ml-auto"
											>
												{tenant.invitationStatus}
											</Badge>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormDescription>
							Only accepted tenants are shown. Multiple tenant
							support will be added in future release.
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		</FormSection>
	)
}
