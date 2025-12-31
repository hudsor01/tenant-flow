'use client'

import { AlertCircle, Building2, User } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type {
	GenerateLeaseProperty,
	GenerateLeaseTenant,
	LeaseTemplate,
	LeaseFormData
} from './types'

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

// ============================================================================
// TYPES
// ============================================================================

export interface LeaseStepReviewProps {
	properties: GenerateLeaseProperty[]
	existingTenants: GenerateLeaseTenant[]
	templates: LeaseTemplate[]
	formData: Partial<LeaseFormData>
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LeaseStepReview - Review step for lease wizard
 *
 * Features:
 * - Summary of all selected options
 * - Property, unit, and tenant display
 * - Lease terms overview
 * - Ready to generate notice
 */
export function LeaseStepReview({
	properties,
	existingTenants,
	templates,
	formData
}: LeaseStepReviewProps) {
	// Get selected entities
	const selectedProperty = properties.find(p => p.id === formData.propertyId)
	const selectedUnit = selectedProperty?.units.find(
		u => u.id === formData.unitId
	)
	const selectedTenant = existingTenants.find(t => t.id === formData.tenantId)
	const selectedTemplate = templates.find(t => t.id === formData.templateId)

	return (
		<BlurFade delay={0.3} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h2 className="text-lg font-medium mb-4">Review Lease Details</h2>

				<div className="space-y-6">
					{/* Property & Unit */}
					<div className="p-4 bg-muted/30 rounded-lg">
						<h3 className="text-sm font-medium text-muted-foreground mb-3">
							Property & Unit
						</h3>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<Building2 className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="font-medium">{selectedProperty?.name}</p>
								<p className="text-sm text-muted-foreground">
									Unit {selectedUnit?.number}
								</p>
							</div>
						</div>
					</div>

					{/* Tenant */}
					<div className="p-4 bg-muted/30 rounded-lg">
						<h3 className="text-sm font-medium text-muted-foreground mb-3">
							Tenant
						</h3>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
								<User className="w-5 h-5 text-muted-foreground" />
							</div>
							<div>
								<p className="font-medium">
									{selectedTenant?.name || formData.newTenant?.name}
								</p>
								<p className="text-sm text-muted-foreground">
									{selectedTenant?.email || formData.newTenant?.email}
								</p>
							</div>
						</div>
					</div>

					{/* Lease Terms */}
					<div className="p-4 bg-muted/30 rounded-lg">
						<h3 className="text-sm font-medium text-muted-foreground mb-3">
							Lease Terms
						</h3>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm text-muted-foreground">Template</p>
								<p className="font-medium">{selectedTemplate?.name}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Term</p>
								<p className="font-medium">
									{formData.startDate} to {formData.endDate}
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Monthly Rent</p>
								<p className="font-medium">
									{formatCurrency(formData.rentAmount || 0)}
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Security Deposit</p>
								<p className="font-medium">
									{formatCurrency(formData.securityDeposit || 0)}
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Payment Due</p>
								<p className="font-medium">
									{formData.paymentDay}st of each month
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Late Fee</p>
								<p className="font-medium">
									{formatCurrency(formData.lateFeeAmount || 0)} after{' '}
									{formData.gracePeriodDays} days
								</p>
							</div>
						</div>
					</div>

					{/* Ready Notice */}
					<div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
						<div className="flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
									Ready to Generate
								</p>
								<p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
									Once generated, the lease will be created as a draft. You can
									review and edit it before sending for signatures.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
