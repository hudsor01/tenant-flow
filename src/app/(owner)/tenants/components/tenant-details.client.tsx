'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { useMarkTenantAsMovedOutMutation } from '#hooks/api/use-tenant-mutations'
import { MoveOutDialog } from './move-out-dialog'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { handleMutationError } from '#lib/mutation-error-handler'
import { formatDate } from '#lib/formatters/date'
import { Calendar, Edit, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DocumentsSection } from '#components/documents/documents-section'

interface TenantDetailsProps {
	id: string
}

// Modern date validation - throws on invalid input
const validateMoveOutDate = (dateString: string): void => {
	if (!dateString) {
		throw new Error('Move out date is required')
	}

	const date = new Date(dateString)
	if (isNaN(date.getTime())) {
		throw new Error('Invalid date format')
	}

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (date < today) {
		throw new Error('Move out date cannot be in the past')
	}
}

export function TenantDetails({ id }: TenantDetailsProps) {
	const { data: tenant } = useSuspenseQuery(tenantQueries.withLease(id))
	const router = useRouter()
	const markAsMovedOut = useMarkTenantAsMovedOutMutation()

	// Move-out dialog state
	const [moveOutDialogOpen, setMoveOutDialogOpen] = useState(false)
	const [moveOutDate, setMoveOutDate] = useState('')
	const [moveOutReason, setMoveOutReason] = useState('')
	const [additionalNotes, setAdditionalNotes] = useState('')

	const handleMarkAsMovedOut = async () => {
		// Validate move-out date before mutation
		try {
			validateMoveOutDate(moveOutDate)
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Invalid move-out date'
			)
			return
		}

		if (!moveOutReason) {
			toast.error('Please select a reason')
			return
		}

		try {
			await markAsMovedOut.mutateAsync({
				id,
				data: {
					moveOutDate,
					moveOutReason: `${moveOutReason}${additionalNotes ? `: ${additionalNotes}` : ''}`
				}
			})
			toast.success('Tenant marked as moved out')
			setMoveOutDialogOpen(false)
			router.push('/tenants')
		} catch (error) {
			handleMutationError(error, 'Mark tenant as moved out')
		}
	}

	// Header with Actions
	const header = (
		<div className="flex-between">
			<div>
				<h1 className="typography-h2 tracking-tight">{tenant.name}</h1>
				<p className="text-muted-foreground mt-1">{tenant.email}</p>
			</div>

			<div className="flex items-center gap-2">
				<Link href={`/tenants/${id}/edit`}>
					<Button variant="outline" className="flex items-center gap-2">
						<Edit className="size-4" />
						Edit
					</Button>
				</Link>
			</div>
		</div>
	)

	return (
		<>
			<div className="space-y-6">
				{header}

				{/* Tenant Information */}
				<CardLayout
					title="Contact Information"
					description="Tenant's contact details and emergency information"
				>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<div className="text-muted-foreground flex items-center gap-2">
								<Mail className="size-4" />
								Email
							</div>
							<div className="font-medium">
								{tenant.email || 'Not provided'}
							</div>
						</div>

						<div className="space-y-1">
							<div className="text-muted-foreground flex items-center gap-2">
								<Phone className="size-4" />
								Phone
							</div>
							<div className="font-medium">
								{tenant.phone || 'Not provided'}
							</div>
						</div>
					</div>

					{tenant.emergency_contact_name && (
						<div className="pt-4 border-t">
							<div className="text-muted-foreground mb-2">Emergency Contact</div>
							<div className="font-medium whitespace-pre-wrap">
								{tenant.emergency_contact_name}
								{tenant.emergency_contact_phone && (
									<div>{tenant.emergency_contact_phone}</div>
								)}
								{tenant.emergency_contact_relationship && (
									<div className="text-caption">
										{tenant.emergency_contact_relationship}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Created and Updated Dates */}
					<div className="pt-4 border-t">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="space-y-1">
								<div className="text-muted-foreground flex items-center gap-2">
									<Calendar className="size-4" />
									Created
								</div>
								<div className="font-medium">
									{formatDate(tenant.created_at ?? new Date().toISOString(), {
										formatOptions: {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										}
									})}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-muted-foreground flex items-center gap-2">
									<Calendar className="size-4" />
									Updated
								</div>
								<div className="font-medium">
									{formatDate(tenant.updated_at as string, {
										formatOptions: {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										}
									})}
								</div>
							</div>
						</div>
					</div>
				</CardLayout>

				{/* Lease Information */}
				{tenant.leases && tenant.leases.length > 0 && (
					<CardLayout
						title="Active Leases"
						description="Current lease agreements for this tenant"
					>
						<div className="space-y-3">
							{tenant.leases.map(lease => (
								<div
									key={lease.id}
									className="flex-between p-4 border rounded-lg"
								>
									<div className="space-y-1">
										<div className="font-medium">
											{lease.property?.address_line1 || 'Unknown Property'}
										</div>
										<div className="text-muted-foreground flex items-center gap-4">
											<span className="flex items-center gap-1">
												<Calendar className="size-3" />
												{formatDate(lease.start_date)} -{' '}
												{lease.end_date
													? formatDate(lease.end_date)
													: 'Month-to-Month'}
											</span>
											<span>${lease.rent_amount}/mo</span>
										</div>
									</div>
									<Badge
										variant={
											lease.status === 'active' ? 'default' : 'secondary'
										}
									>
										{lease.status}
									</Badge>
								</div>
							))}
						</div>
					</CardLayout>
				)}
			</div>

			{/* Wrap in space-y-6 so the Mark as Moved Out button + documents
			    section share the same vertical rhythm as the leases/personal-
			    info sections above. */}
			<div className="space-y-6">
				<Button variant="outline" onClick={() => setMoveOutDialogOpen(true)}>
					Mark as Moved Out
				</Button>

				<DocumentsSection entityType="tenant" entityId={id} />
			</div>

			<MoveOutDialog
				open={moveOutDialogOpen}
				onOpenChange={setMoveOutDialogOpen}
				moveOutDate={moveOutDate}
				onMoveOutDateChange={setMoveOutDate}
				moveOutReason={moveOutReason}
				onMoveOutReasonChange={setMoveOutReason}
				additionalNotes={additionalNotes}
				onAdditionalNotesChange={setAdditionalNotes}
				isPending={markAsMovedOut.isPending}
				onSubmit={handleMarkAsMovedOut}
			/>
		</>
	)
}
