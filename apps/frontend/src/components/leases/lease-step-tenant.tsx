'use client'

import { Plus, Search, User } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { GenerateLeaseTenant, LeaseFormData } from './types'

// ============================================================================
// TYPES
// ============================================================================

export type TenantMode = 'existing' | 'new'

export interface LeaseStepTenantProps {
	existingTenants: GenerateLeaseTenant[]
	formData: Partial<LeaseFormData>
	onFormDataChange: (data: Partial<LeaseFormData>) => void
	tenantMode: TenantMode
	onTenantModeChange: (mode: TenantMode) => void
	tenantSearch: string
	onTenantSearchChange: (search: string) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LeaseStepTenant - Tenant selection/creation step for lease wizard
 *
 * Features:
 * - Toggle between existing and new tenant
 * - Search existing tenants
 * - Form to add new tenant details
 */
export function LeaseStepTenant({
	existingTenants,
	formData,
	onFormDataChange,
	tenantMode,
	onTenantModeChange,
	tenantSearch,
	onTenantSearchChange
}: LeaseStepTenantProps) {
	// Filter tenants by search
	const filteredTenants = existingTenants.filter(t => {
		const query = tenantSearch.toLowerCase()
		const name = t.name ?? ''
		const email = t.email ?? ''
		return name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
	})

	const handleExistingTenantSelect = (tenantId: string) => {
		const { newTenant: _removed, ...rest } = formData
		onFormDataChange({
			...rest,
			tenantId
		})
	}

	const handleNewTenantChange = (
		field: 'name' | 'email' | 'phone',
		value: string
	) => {
		const { tenantId: _removed, ...rest } = formData
		onFormDataChange({
			...rest,
			newTenant: {
				name: formData.newTenant?.name || '',
				email: formData.newTenant?.email || '',
				phone: formData.newTenant?.phone || '',
				[field]: value
			}
		})
	}

	return (
		<BlurFade delay={0.3} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h2 className="text-lg font-medium mb-4">Select or Add Tenant</h2>

				{/* Mode Toggle */}
				<div className="flex gap-2 mb-4">
					<button
						onClick={() => onTenantModeChange('existing')}
						className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
							tenantMode === 'existing'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:text-foreground'
						}`}
					>
						Existing Tenant
					</button>
					<button
						onClick={() => onTenantModeChange('new')}
						className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
							tenantMode === 'new'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:text-foreground'
						}`}
					>
						<Plus className="w-4 h-4 inline-block mr-1" />
						New Tenant
					</button>
				</div>

				{tenantMode === 'existing' ? (
					<div className="space-y-4">
						{/* Search Input */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search tenants..."
								value={tenantSearch}
								onChange={e => onTenantSearchChange(e.target.value)}
								className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>

						{/* Tenant List */}
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{filteredTenants.map(tenant => (
								<button
									key={tenant.id}
									onClick={() => handleExistingTenantSelect(tenant.id)}
									className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
										formData.tenantId === tenant.id
											? 'border-primary bg-primary/5'
											: 'border-border hover:border-primary/50'
									}`}
								>
									<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
										<User className="w-5 h-5 text-muted-foreground" />
									</div>
									<div>
										<p className="font-medium">{tenant.name}</p>
										<p className="text-sm text-muted-foreground">
											{tenant.email}
										</p>
									</div>
								</button>
							))}
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{/* Full Name */}
						<div>
							<label className="block text-sm font-medium mb-1">
								Full Name
							</label>
							<input
								type="text"
								value={formData.newTenant?.name || ''}
								onChange={e => handleNewTenantChange('name', e.target.value)}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="John Doe"
							/>
						</div>

						{/* Email */}
						<div>
							<label className="block text-sm font-medium mb-1">
								Email Address
							</label>
							<input
								type="email"
								value={formData.newTenant?.email || ''}
								onChange={e => handleNewTenantChange('email', e.target.value)}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="john@email.com"
							/>
						</div>

						{/* Phone */}
						<div>
							<label className="block text-sm font-medium mb-1">
								Phone Number
							</label>
							<input
								type="tel"
								value={formData.newTenant?.phone || ''}
								onChange={e => handleNewTenantChange('phone', e.target.value)}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
								placeholder="(555) 123-4567"
							/>
						</div>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
