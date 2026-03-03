'use client'

/**
 * Lease Creation Wizard - Step 1: Selection
 * Property, Unit, and Tenant selection with cascading filters
 *
 * Features:
 * - Cascading property → unit → tenant selection
 * - Vacant unit filtering (only shows available units)
 * - Auto-populate rent/deposit from selected unit
 * - Inline tenant invitation form
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'
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
import { Button } from '#components/ui/button'
import { AlertCircle, Loader2, Mail, UserPlus } from 'lucide-react'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import type { SelectionStepData } from '@repo/shared/validation/lease-wizard.schemas'
import type {
	Property as SharedProperty,
	Unit as SharedUnit
} from '@repo/shared/types/core'

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
	const queryClient = useQueryClient()

	// Invite mode state
	const [inviteMode, setInviteMode] = useState(false)
	const [inviteForm, setInviteForm] = useState({
		first_name: '',
		last_name: '',
		email: '',
		phone: ''
	})

	// Fetch properties via Supabase PostgREST
	const {
		data: properties,
		isLoading: propertiesLoading,
		error: propertiesError
	} = useQuery({
		queryKey: ['properties', 'list'],
		queryFn: async () => {
			const supabase = createClient()
			const { data: rows, error } = await supabase
				.from('properties')
				.select('id, name, address_line1, city, state')
				.neq('status', 'inactive')
				.order('name')
			if (error) throw error
			return (rows ?? []) as Property[]
		}
	})

	// Fetch available units filtered by selected property via Supabase PostgREST
	const {
		data: units,
		isLoading: unitsLoading,
		error: unitsError
	} = useQuery({
		queryKey: ['units', 'by-property', data.property_id, 'available'],
		queryFn: async () => {
			const supabase = createClient()
			const { data: rows, error } = await supabase
				.from('units')
				.select('id, unit_number, property_id, rent_amount')
				.eq('property_id', data.property_id ?? '')
				.eq('status', 'available')
				.order('unit_number')
			if (error) throw error
			return (rows ?? []) as Unit[]
		},
		enabled: !!data.property_id
	})

	// Fetch tenants (filtered by selected property) via Supabase PostgREST
	const {
		data: tenants,
		isLoading: tenantsLoading,
		error: tenantsError
	} = useQuery({
		queryKey: ['tenants', 'list', data.property_id],
		queryFn: async () => {
			const supabase = createClient()
			let query = supabase
				.from('tenants')
				.select('id, first_name, last_name, email')
				.neq('status', 'inactive')
				.order('last_name')
			if (data.property_id) {
				query = query.eq('property_id', data.property_id)
			}
			const { data: rows, error } = await query
			if (error) throw error
			return (rows ?? []) as Tenant[]
		}
	})

	// Inline tenant invitation mutation (doesn't require lease_id)
	const inviteMutation = useMutation({
		mutationFn: async (inviteData: {
			first_name: string
			last_name: string
			email: string
			phone: string
		}) => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)

			const invitationCode = crypto.randomUUID()
			const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
			const invitationUrl = `${appBaseUrl}/auth/accept-invitation?code=${invitationCode}`
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

			const { error } = await supabase
				.from('tenant_invitations')
				.insert({
					email: inviteData.email,
					owner_user_id: ownerId,
					property_id: data.property_id ?? null,
					invitation_code: invitationCode,
					invitation_url: invitationUrl,
					expires_at: expiresAt,
					status: 'sent',
					type: 'lease_signing'
				})

			if (error) throw new Error(error.message || 'Failed to send invitation')
		},
		onSuccess: () => {
			toast.success('Invitation sent', {
				description: `${inviteForm.first_name} ${inviteForm.last_name} will receive an email to join`
			})
			setInviteMode(false)
			setInviteForm({ first_name: '', last_name: '', email: '', phone: '' })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
		},
		onError: (error: Error) => {
			toast.error(error.message)
		}
	})

	const handlePropertyChange = (propertyId: string) => {
		const newData: Partial<SelectionStepData> = {
			property_id: propertyId
		}
		if (data.primary_tenant_id) {
			newData.primary_tenant_id = data.primary_tenant_id
		}
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

	const handleSendInvite = () => {
		if (!inviteForm.first_name || !inviteForm.last_name || !inviteForm.email) return
		inviteMutation.mutate(inviteForm)
	}

	const isInviteFormValid = inviteForm.first_name && inviteForm.last_name && inviteForm.email

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
						<Combobox
							value={data.property_id ?? ''}
							onValueChange={handlePropertyChange}
						>
							<ComboboxAnchor id="property">
								<ComboboxInput placeholder="Search properties..." />
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
						<Combobox
							value={data.unit_id ?? ''}
							onValueChange={handleUnitChange}
						>
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
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setInviteMode(!inviteMode)}
						>
							{inviteMode ? (
								'Existing Tenant'
							) : (
								<>
									<Mail className="mr-1.5 h-3.5 w-3.5" />
									Invite New Tenant
								</>
							)}
						</Button>
					</div>

					{inviteMode ? (
						<div className="space-y-3 rounded-md border border-border p-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label htmlFor="invite_first_name">First Name *</Label>
									<Input
										id="invite_first_name"
										value={inviteForm.first_name}
										onChange={e =>
											setInviteForm(f => ({ ...f, first_name: e.target.value }))
										}
										placeholder="Jane"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="invite_last_name">Last Name *</Label>
									<Input
										id="invite_last_name"
										value={inviteForm.last_name}
										onChange={e =>
											setInviteForm(f => ({ ...f, last_name: e.target.value }))
										}
										placeholder="Doe"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label htmlFor="invite_email">Email *</Label>
									<Input
										id="invite_email"
										type="email"
										value={inviteForm.email}
										onChange={e =>
											setInviteForm(f => ({ ...f, email: e.target.value }))
										}
										placeholder="jane@example.com"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="invite_phone">Phone</Label>
									<Input
										id="invite_phone"
										type="tel"
										value={inviteForm.phone}
										onChange={e =>
											setInviteForm(f => ({ ...f, phone: e.target.value }))
										}
										placeholder="(555) 123-4567"
									/>
								</div>
							</div>
							<Button
								type="button"
								size="sm"
								onClick={handleSendInvite}
								disabled={!isInviteFormValid || inviteMutation.isPending}
							>
								{inviteMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<UserPlus className="mr-2 h-3.5 w-3.5" />
										Send Invitation
									</>
								)}
							</Button>
						</div>
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
								<EmptyMedia variant="icon">
									<UserPlus />
								</EmptyMedia>
								<EmptyTitle>No Tenants Available</EmptyTitle>
								<EmptyDescription>
									{data.property_id
										? 'No tenants have been invited to this property yet. Use "Invite New Tenant" above to get started.'
										: 'No tenants found. Use "Invite New Tenant" above to get started.'}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Combobox
							value={data.primary_tenant_id ?? ''}
							onValueChange={handleTenantChange}
						>
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
