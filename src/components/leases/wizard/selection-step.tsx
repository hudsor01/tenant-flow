'use client'

/**
 * Lease Creation Wizard - Step 1: Selection
 * Property, Unit, and Tenant selection with cascading filters
 *
 * Features:
 * - Cascading property -> unit -> tenant selection
 * - Vacant unit filtering (only shows available units)
 * - Auto-populate rent/deposit from selected unit
 * - Inline tenant invitation form
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { Label } from '#components/ui/label'
import {
	Combobox,
	ComboboxAnchor,
	ComboboxInput,
	ComboboxTrigger,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem
} from '#components/ui/combobox'
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
	EmptyMedia
} from '#components/ui/empty'
import { AlertCircle, UserPlus } from 'lucide-react'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { InlineTenantInvite, TenantModeToggle } from './selection-step-filters'
import type { SelectionStepData } from '#lib/validation/lease-wizard.schemas'
import type {
	Property as SharedProperty,
	Unit as SharedUnit
} from '#types/core'

interface SelectionStepProps {
	data: Partial<SelectionStepData>
	onChange: (data: Partial<SelectionStepData>) => void
	onUnitSelected?: (rentAmount: number | null) => void
}

// Use Pick to get minimal fields from shared types
type Property = Pick<SharedProperty, 'id' | 'name' | 'address_line1' | 'city' | 'state'>
type Unit = Pick<SharedUnit, 'id' | 'unit_number' | 'property_id' | 'rent_amount'>

// Tenant API response - the API returns tenant with user info joined
// This is the shape of the API response, not a duplicate of shared types
interface Tenant {
	id: string
	first_name: string
	last_name: string
	email: string
}

export function SelectionStep({ data, onChange, onUnitSelected }: SelectionStepProps) {
	const [inviteMode, setInviteMode] = useState(false)

	const { data: properties, isLoading: propertiesLoading, error: propertiesError } = useQuery({
		queryKey: [...propertyQueries.all(), 'list'],
		queryFn: async () => {
			const supabase = createClient()
			const { data: rows, error } = await supabase.from('properties').select('id, name, address_line1, city, state').neq('status', 'inactive').order('name')
			if (error) throw error
			return (rows ?? []) as Property[]
		}
	})

	const { data: units, isLoading: unitsLoading, error: unitsError } = useQuery({
		queryKey: [...unitQueries.all(), 'by-property', data.property_id, 'available'],
		queryFn: async () => {
			const supabase = createClient()
			const { data: rows, error } = await supabase.from('units').select('id, unit_number, property_id, rent_amount').eq('property_id', data.property_id ?? '').eq('status', 'available').order('unit_number')
			if (error) throw error
			return (rows ?? []) as Unit[]
		},
		enabled: !!data.property_id
	})

	const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useQuery({
		queryKey: [...tenantQueries.all(), 'list-for-lease'],
		queryFn: async () => {
			const supabase = createClient()
			const { data: rows, error } = await supabase
				.from('tenants')
				.select('id, users!inner(first_name, last_name, email)')
				.neq('users.status', 'inactive')
			if (error) throw error
			return (rows ?? [])
				.map(row => {
					const user = row.users as unknown as { first_name: string | null; last_name: string | null; email: string }
					return {
						id: row.id,
						first_name: user.first_name ?? '',
						last_name: user.last_name ?? '',
						email: user.email
					} satisfies Tenant
				})
				.sort((a, b) => a.last_name.localeCompare(b.last_name))
		}
	})

	const handlePropertyChange = (propertyId: string) => {
		const newData: Partial<SelectionStepData> = { property_id: propertyId }
		if (data.primary_tenant_id) { newData.primary_tenant_id = data.primary_tenant_id }
		onChange(newData)
	}

	const handleUnitChange = (unitId: string) => {
		onChange({ ...data, unit_id: unitId })
		const selectedUnit = units?.find(u => u.id === unitId)
		onUnitSelected?.(selectedUnit?.rent_amount ?? null)
	}

	const handleTenantChange = (tenantId: string) => {
		onChange({ ...data, primary_tenant_id: tenantId })
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium mb-4">Select Property & Tenant</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Choose the property, unit, and tenant for this lease agreement.
				</p>
			</div>

			<div className="space-y-4">
				{/* Property Selection */}
				<div className="space-y-2">
					<Label htmlFor="property">Property *</Label>
					{propertiesLoading ? (
						<Skeleton className="h-10 w-full" />
					) : propertiesError ? (
						<div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
							<AlertCircle className="h-4 w-4" />
							Failed to load properties: {propertiesError.message}
						</div>
					) : (
						<Combobox value={data.property_id ?? ''} onValueChange={handlePropertyChange}>
							<ComboboxAnchor id="property">
								<ComboboxInput placeholder="Search properties..." autoFocus />
								<ComboboxTrigger />
							</ComboboxAnchor>
							<ComboboxContent>
								<ComboboxEmpty>No properties found</ComboboxEmpty>
								{properties?.map(property => (
									<ComboboxItem key={property.id} value={property.id}>
										{property.name} - {property.address_line1}, {property.city}
									</ComboboxItem>
								))}
							</ComboboxContent>
						</Combobox>
					)}
				</div>

				{/* Unit Selection */}
				<div className="space-y-2">
					<Label htmlFor="unit">Unit *</Label>
					{!data.property_id ? (
						<div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted rounded-md">
							<AlertCircle className="h-4 w-4" />
							Select a property first
						</div>
					) : unitsLoading ? (
						<Skeleton className="h-10 w-full" />
					) : unitsError ? (
						<div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
							<AlertCircle className="h-4 w-4" />
							Failed to load units: {unitsError.message}
						</div>
					) : units?.length === 0 ? (
						<div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted rounded-md">
							<AlertCircle className="h-4 w-4" />
							No available units for this property
						</div>
					) : (
						<Combobox value={data.unit_id ?? ''} onValueChange={handleUnitChange}>
							<ComboboxAnchor id="unit">
								<ComboboxInput placeholder="Search units..." />
								<ComboboxTrigger />
							</ComboboxAnchor>
							<ComboboxContent>
								<ComboboxEmpty>No units found</ComboboxEmpty>
								{units?.map(unit => (
									<ComboboxItem key={unit.id} value={unit.id}>
										{unit.unit_number || 'Main Unit'}
									</ComboboxItem>
								))}
							</ComboboxContent>
						</Combobox>
					)}
				</div>

				{/* Tenant Selection */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="tenant">Primary Tenant *</Label>
						<TenantModeToggle inviteMode={inviteMode} onToggle={() => setInviteMode(!inviteMode)} />
					</div>

					{inviteMode ? (
						<InlineTenantInvite propertyId={data.property_id} onToggleMode={() => setInviteMode(false)} />
					) : tenantsLoading ? (
						<Skeleton className="h-10 w-full" />
					) : tenantsError ? (
						<div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
							<AlertCircle className="h-4 w-4" />
							Failed to load tenants: {tenantsError.message}
						</div>
					) : tenants?.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon"><UserPlus /></EmptyMedia>
								<EmptyTitle>No Tenants Available</EmptyTitle>
								<EmptyDescription>
									{data.property_id
										? 'No tenants have been invited to this property yet. Use "Invite New Tenant" above to get started.'
										: 'No tenants found. Use "Invite New Tenant" above to get started.'}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Combobox value={data.primary_tenant_id ?? ''} onValueChange={handleTenantChange}>
							<ComboboxAnchor id="tenant">
								<ComboboxInput placeholder="Search tenants..." />
								<ComboboxTrigger />
							</ComboboxAnchor>
							<ComboboxContent>
								<ComboboxEmpty>No tenants found</ComboboxEmpty>
								{tenants?.map(tenant => (
									<ComboboxItem key={tenant.id} value={tenant.id}>
										{tenant.first_name} {tenant.last_name} ({tenant.email})
									</ComboboxItem>
								))}
							</ComboboxContent>
						</Combobox>
					)}
				</div>
			</div>
		</div>
	)
}
