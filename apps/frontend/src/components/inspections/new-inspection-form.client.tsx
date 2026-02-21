'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '#components/ui/button'
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useCreateInspection } from '#hooks/api/use-inspections'
import { useLeaseList } from '#hooks/api/use-lease'
import type { CreateInspectionInput } from '@repo/shared/validation/inspections'
import type { LeaseWithRelations } from '@repo/shared/types/relations'

export function NewInspectionForm() {
	const router = useRouter()
	const createInspection = useCreateInspection()
	const { data: leasesResponse, isLoading: loadingLeases } = useLeaseList({
		status: 'active',
		limit: 100
	})

	const leases = (leasesResponse?.data ?? []) as LeaseWithRelations[]

	const [leaseId, setLeaseId] = useState('')
	const [inspectionType, setInspectionType] = useState<'move_in' | 'move_out'>('move_in')
	const [scheduledDate, setScheduledDate] = useState('')

	const selectedLease = leases.find(l => l.id === leaseId)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!leaseId || !selectedLease) return

		// Get property_id from the unit's property relationship
		const propertyId = selectedLease.unit?.property?.id
		if (!propertyId) return

		const dto: CreateInspectionInput = {
			lease_id: leaseId,
			property_id: propertyId,
			unit_id: selectedLease.unit?.id ?? null,
			inspection_type: inspectionType,
			scheduled_date: scheduledDate || null
		}

		const result = await createInspection.mutateAsync(dto)
		const newId = (result as { id?: string }).id
		if (newId) {
			router.push(`/inspections/${newId}`)
		}
	}

	function getLeaseLabel(lease: LeaseWithRelations): string {
		const propertyName = lease.unit?.property?.name ?? 'Property'
		const unitNumber = lease.unit?.unit_number
		return unitNumber
			? `${propertyName} — Unit ${unitNumber}`
			: propertyName
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Lease selection */}
			<div className="space-y-2">
				<Label htmlFor="lease">Lease</Label>
				<Select
					value={leaseId}
					onValueChange={setLeaseId}
					disabled={loadingLeases}
				>
					<SelectTrigger id="lease" className="w-full">
						<SelectValue
							placeholder={
								loadingLeases ? 'Loading leases...' : 'Select a lease'
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{leases.length === 0 && !loadingLeases && (
							<SelectItem value="_none" disabled>
								No active leases found
							</SelectItem>
						)}
						{leases.map(lease => (
							<SelectItem key={lease.id} value={lease.id}>
								{getLeaseLabel(lease)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Inspection type */}
			<div className="space-y-2">
				<Label htmlFor="inspection-type">Inspection type</Label>
				<Select
					value={inspectionType}
					onValueChange={(v) => setInspectionType(v as 'move_in' | 'move_out')}
				>
					<SelectTrigger id="inspection-type" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="move_in">Move-In</SelectItem>
						<SelectItem value="move_out">Move-Out</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Scheduled date */}
			<div className="space-y-2">
				<Label htmlFor="scheduled-date">Scheduled date (optional)</Label>
				<Input
					id="scheduled-date"
					type="date"
					value={scheduledDate}
					onChange={e => setScheduledDate(e.target.value)}
				/>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-3 pt-2">
				<Button
					type="submit"
					disabled={!leaseId || createInspection.isPending}
					className="min-h-11"
				>
					{createInspection.isPending ? 'Creating...' : 'Create Inspection'}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.back()}
					className="min-h-11"
				>
					Cancel
				</Button>
			</div>
		</form>
	)
}
