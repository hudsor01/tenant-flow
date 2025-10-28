'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import { useMarkTenantAsMovedOut, useTenantWithLease } from '#hooks/api/use-tenant'
import { Calendar, Edit, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { toast } from 'sonner'
import { TenantSkeleton } from './tenant-skeleton'

interface TenantDetailsProps {
	id: string
}

// Modern date formatting helper - assumes valid inputs
const formatDate = (
	date: string | Date,
	options?: Intl.DateTimeFormatOptions
): string => {
	const dateObj = new Date(date)
	return dateObj.toLocaleDateString('en-US', options)
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
	const { data: tenant, isLoading, isError } = useTenantWithLease(id)
	const router = useRouter()
	const markAsMovedOut = useMarkTenantAsMovedOut()

	// Move-out dialog state
	const [moveOutDialogOpen, setMoveOutDialogOpen] = React.useState(false)
	const [moveOutDate, setMoveOutDate] = React.useState('')
	const [moveOutReason, setMoveOutReason] = React.useState('')
	const [additionalNotes, setAdditionalNotes] = React.useState('')

	const handleMarkAsMovedOut = async () => {
		try {
			// Validate move-out date
			validateMoveOutDate(moveOutDate)

			if (!moveOutReason) {
				toast.error('Please select a reason')
				return
			}

			await markAsMovedOut.mutateAsync({
				id,
				data: {
					moveOutDate,
					moveOutReason: `${moveOutReason}${additionalNotes ? `: ${additionalNotes}` : ''}`
				}
			})
			toast.success('Tenant marked as moved out')
			setMoveOutDialogOpen(false)
			router.push('/manage/tenants')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to mark tenant as moved out'
			)
		}
	}

	if (isLoading) {
		return <TenantSkeleton />
	}

	if (isError || !tenant) {
		return (
			<CardLayout
				title="Tenant Not Found"
				description="The tenant you're looking for doesn't exist."
			>
				<div className="rounded-lg border-destructive/40 bg-destructive/10 p-6 text-destructive">
					The tenant you&apos;re looking for doesn&apos;t exist or there was a
					problem loading the data.
				</div>
			</CardLayout>
		)
	}

	// Header with Actions
	const header = (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
				<p className="text-muted-foreground mt-1">{tenant.email}</p>
			</div>

			<div className="flex items-center gap-2">
				<Link href={`/manage/tenants/${id}/edit`}>
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
							<div className="text-sm text-muted-foreground flex items-center gap-2">
								<Mail className="size-4" />
								Email
							</div>
							<div className="font-medium">
								{tenant.email || 'Not provided'}
							</div>
						</div>

						<div className="space-y-1">
							<div className="text-sm text-muted-foreground flex items-center gap-2">
								<Phone className="size-4" />
								Phone
							</div>
							<div className="font-medium">
								{tenant.phone || 'Not provided'}
							</div>
						</div>
					</div>

					{tenant.emergencyContact && (
						<div className="pt-4 border-t">
							<div className="text-sm text-muted-foreground mb-2">
								Emergency Contact
							</div>
							<div className="font-medium whitespace-pre-wrap">
								{tenant.emergencyContact}
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
									{formatDate(tenant.createdAt, {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-muted-foreground flex items-center gap-2">
									<Calendar className="size-4" />
									Updated
								</div>
								<div className="font-medium">
									{formatDate(tenant.updatedAt, {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
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
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div className="space-y-1">
										<div className="font-medium">
											{lease.property?.address || 'Unknown Property'}
										</div>
										<div className="text-sm text-muted-foreground flex items-center gap-4">
											<span className="flex items-center gap-1">
												<Calendar className="size-3" />
												{formatDate(lease.startDate)} -{' '}
												{formatDate(lease.endDate)}
											</span>
											<span>${lease.rentAmount}/mo</span>
										</div>
									</div>
									<Badge
										variant={
											lease.status === 'ACTIVE' ? 'default' : 'secondary'
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

			{/* Mark as Moved Out button */}
			<div className="mt-4">
				<Button variant="outline" onClick={() => setMoveOutDialogOpen(true)}>
					Mark as Moved Out
				</Button>
			</div>

			{/* Move-out dialog using existing Dialog component */}
			<Dialog open={moveOutDialogOpen} onOpenChange={setMoveOutDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark Tenant as Moved Out</DialogTitle>
						<DialogDescription>
							This will mark the tenant as moved out and remove them from active
							listings. All data will be retained for legal compliance.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="moveOutDate">Move Out Date *</Label>
							<Input
								id="moveOutDate"
								type="date"
								value={moveOutDate}
								onChange={e => setMoveOutDate(e.target.value)}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="moveOutReason">Reason *</Label>
							<Select value={moveOutReason} onValueChange={setMoveOutReason}>
								<SelectTrigger id="moveOutReason">
									<SelectValue placeholder="Select reason" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="lease_expired">Lease Expired</SelectItem>
									<SelectItem value="early_termination">
										Early Termination
									</SelectItem>
									<SelectItem value="eviction">Eviction</SelectItem>
									<SelectItem value="purchase">Purchased Property</SelectItem>
									<SelectItem value="relocation">Relocation</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="additionalNotes">
								Additional Notes (Optional)
							</Label>
							<Textarea
								id="additionalNotes"
								value={additionalNotes}
								onChange={e => setAdditionalNotes(e.target.value)}
								placeholder="Any additional details..."
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setMoveOutDialogOpen(false)}
							disabled={markAsMovedOut.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleMarkAsMovedOut}
							disabled={
								markAsMovedOut.isPending || !moveOutDate || !moveOutReason
							}
						>
							{markAsMovedOut.isPending ? 'Processing...' : 'Mark as Moved Out'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
