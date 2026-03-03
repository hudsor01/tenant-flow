'use client'

import { Building2, Home } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { GenerateLeaseProperty, LeaseFormData } from './types'

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

export interface LeaseStepPropertyProps {
	properties: GenerateLeaseProperty[]
	formData: Partial<LeaseFormData>
	onFormDataChange: (data: Partial<LeaseFormData>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LeaseStepProperty - Property & Unit selection step for lease wizard
 *
 * Features:
 * - Property selection cards with unit counts
 * - Unit selection with rent and room info
 * - Auto-sets rent and security deposit from unit
 */
export function LeaseStepProperty({
	properties,
	formData,
	onFormDataChange
}: LeaseStepPropertyProps) {
	const selectedProperty = properties.find(p => p.id === formData.propertyId)

	const handlePropertySelect = (propertyId: string) => {
		// Clear unit selection when property changes
		const { unitId: _removed, ...rest } = formData
		onFormDataChange({
			...rest,
			propertyId
		})
	}

	const handleUnitSelect = (unit: GenerateLeaseProperty['units'][0]) => {
		onFormDataChange({
			...formData,
			unitId: unit.id,
			rentAmount: unit.rent,
			securityDeposit: unit.rent
		})
	}

	return (
		<BlurFade delay={0.3} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h2 className="text-lg font-medium mb-4">Select Property & Unit</h2>

				<div className="space-y-4">
					{/* Property Selection */}
					<div>
						<label className="block text-sm font-medium mb-2">Property</label>
						<div className="grid grid-cols-1 gap-3">
							{properties.map(property => (
								<button
									key={property.id}
									onClick={() => handlePropertySelect(property.id)}
									className={`flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
										formData.propertyId === property.id
											? 'border-primary bg-primary/5'
											: 'border-border hover:border-primary/50'
									}`}
								>
									<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<Building2 className="w-5 h-5 text-primary" />
									</div>
									<div>
										<p className="font-medium">{property.name}</p>
										<p className="text-sm text-muted-foreground">
											{property.units.filter(u => u.status === 'vacant').length}{' '}
											vacant units
										</p>
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Unit Selection */}
					{selectedProperty && (
						<div>
							<label className="block text-sm font-medium mb-2">Unit</label>
							<div className="grid grid-cols-2 gap-3">
								{selectedProperty.units
									.filter(unit => unit.status === 'vacant')
									.map(unit => (
										<button
											key={unit.id}
											onClick={() => handleUnitSelect(unit)}
											className={`flex flex-col p-4 rounded-lg border transition-colors text-left ${
												formData.unitId === unit.id
													? 'border-primary bg-primary/5'
													: 'border-border hover:border-primary/50'
											}`}
										>
											<div className="flex items-center gap-2 mb-2">
												<Home className="w-4 h-4 text-muted-foreground" />
												<span className="font-medium">Unit {unit.number}</span>
											</div>
											<p className="text-sm text-muted-foreground">
												{unit.bedrooms} bed &bull; {unit.bathrooms} bath
											</p>
											<p className="text-sm font-medium text-primary mt-1">
												{formatCurrency(unit.rent)}/mo
											</p>
										</button>
									))}
							</div>
							{selectedProperty.units.filter(u => u.status === 'vacant')
								.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No vacant units available at this property.
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</BlurFade>
	)
}
