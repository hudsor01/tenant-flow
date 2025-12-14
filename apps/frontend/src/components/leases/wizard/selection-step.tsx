'use client'

/**
 * Lease Creation Wizard - Step 1: Selection
 * Property, Unit, and Tenant selection with cascading filters
 */
import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl } from '#lib/api-config'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '#components/ui/empty'
import { Button } from '#components/ui/button'
import { AlertCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'
import type { SelectionStepData } from '@repo/shared/validation/lease-wizard.schemas'

interface SelectionStepProps {
	data: Partial<SelectionStepData>
	onChange: (data: Partial<SelectionStepData>) => void
	token: string
}

interface Property {
	id: string
	name: string
	address_line1: string
	city: string
	state: string
}

interface Unit {
	id: string
	unit_number: string | null
	property_id: string
}

interface Tenant {
	id: string
	first_name: string | null
	last_name: string | null
	email: string
}

export function SelectionStep({ data, onChange, token }: SelectionStepProps) {
	// Fetch properties
	const { data: properties, isLoading: propertiesLoading, error: propertiesError } = useQuery({
		queryKey: ['properties', 'list', token],
		queryFn: async () => {
			const res = await fetch(`${getApiBaseUrl()}/api/v1/properties`, {
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!res.ok) throw new Error('Failed to fetch properties')
			const json = await res.json()
			return json.data as Property[]
		},
		enabled: !!token
	})

	// Fetch units filtered by selected property
	const { data: units, isLoading: unitsLoading, error: unitsError } = useQuery({
		queryKey: ['units', 'list', data.property_id, token],
		queryFn: async () => {
			const res = await fetch(`${getApiBaseUrl()}/api/v1/units?property_id=${data.property_id}`, {
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!res.ok) throw new Error('Failed to fetch units')
			const json = await res.json()
			return json.data as Unit[]
		},
		enabled: !!token && !!data.property_id
	})

	// Fetch tenants (all tenants for now, filtering by availability can be added)
	const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useQuery({
		queryKey: ['tenants', 'list', token],
		queryFn: async () => {
			const res = await fetch(`${getApiBaseUrl()}/api/v1/tenants`, {
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!res.ok) throw new Error('Failed to fetch tenants')
			const json = await res.json()
			return json.data as Tenant[]
		},
		enabled: !!token
	})

	const handlePropertyChange = (propertyId: string) => {
		// Reset unit when property changes, keep tenant if set
		const newData: Partial<SelectionStepData> = {
			property_id: propertyId
		}
		if (data.primary_tenant_id) {
			newData.primary_tenant_id = data.primary_tenant_id
		}
		// Don't include unit_id at all when resetting
		onChange(newData)
	}

	const handleUnitChange = (unitId: string) => {
		onChange({
			...data,
			unit_id: unitId
		})
	}

	const handleTenantChange = (tenantId: string) => {
		onChange({
			...data,
			primary_tenant_id: tenantId
		})
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="typography-large mb-4">Select Property & Tenant</h3>
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
						<Select
							value={data.property_id ?? ''}
							onValueChange={handlePropertyChange}
						>
							<SelectTrigger id="property">
								<SelectValue placeholder="Select a property" />
							</SelectTrigger>
							<SelectContent>
								{properties?.map(property => (
									<SelectItem key={property.id} value={property.id}>
										{property.name} - {property.address_line1}, {property.city}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
							No units found for this property
						</div>
					) : (
						<Select value={data.unit_id ?? ''} onValueChange={handleUnitChange}>
							<SelectTrigger id="unit">
								<SelectValue placeholder="Select a unit" />
							</SelectTrigger>
							<SelectContent>
								{units?.map(unit => (
									<SelectItem key={unit.id} value={unit.id}>
										{unit.unit_number || 'Main Unit'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>

				{/* Tenant Selection */}
				<div className="space-y-2">
					<Label htmlFor="tenant">Primary Tenant *</Label>
					{tenantsLoading ? (
						<Skeleton className="h-10 w-full" />
					) : tenantsError ? (
						<div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
							<AlertCircle className="h-4 w-4" />
							Failed to load tenants: {tenantsError.message}
						</div>
				) : tenants?.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<UserPlus />
							</EmptyMedia>
							<EmptyTitle>No Tenants Available</EmptyTitle>
							<EmptyDescription>
								{data.property_id 
									? "No tenants have been invited to this property yet. Invite a tenant to get started."
									: "No tenants found. Create or invite a tenant first."}
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Link href="/tenants/invite">
								<Button size="sm">
									<UserPlus className="mr-2 h-4 w-4" />
									Invite Tenant
								</Button>
							</Link>
						</EmptyContent>
					</Empty>
				) : (
						<Select
							value={data.primary_tenant_id ?? ''}
							onValueChange={handleTenantChange}
						>
							<SelectTrigger id="tenant">
								<SelectValue placeholder="Select a tenant" />
							</SelectTrigger>
							<SelectContent>
								{tenants?.map(tenant => (
									<SelectItem key={tenant.id} value={tenant.id}>
										{tenant.first_name} {tenant.last_name} ({tenant.email})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</div>
		</div>
	)
}
