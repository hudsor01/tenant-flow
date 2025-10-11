'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { useDeleteTenant, useTenant } from '@/hooks/api/use-tenant'
import { useQueryClient } from '@tanstack/react-query'
import { Calendar, Edit, Mail, Phone, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TenantSkeleton } from './tenant-skeleton'

interface TenantDetailsProps {
	id: string
}

export function TenantDetails({ id }: TenantDetailsProps) {
	const router = useRouter()
	const queryClient = useQueryClient()

	const { data: tenant, isLoading, isError } = useTenant(id)

	const deleteMutation = useDeleteTenant({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
			toast.success('Tenant deleted successfully')
			router.push('/manage/tenants')
		},
		onError: (error: Error) => {
			toast.error('Failed to delete tenant', { description: error.message })
		}
	})

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
					The tenant you're looking for doesn't exist or there was a problem
					loading the data.
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
						<Edit className="w-4 h-4" />
						Edit
					</Button>
				</Link>

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="outline"
							className="flex items-center gap-2 text-destructive hover:text-destructive"
						>
							<Trash2 className="w-4 h-4" />
							Delete
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Tenant</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete "{tenant.name}"? This action
								cannot be undone and will remove all associated data including
								leases and payment records.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => deleteMutation.mutate(tenant.id)}
								disabled={deleteMutation.isPending}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{deleteMutation.isPending ? 'Deleting...' : 'Delete Tenant'}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	)

	return (
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
							<Mail className="w-4 h-4" />
							Email
						</div>
						<div className="font-medium">{tenant.email || 'Not provided'}</div>
					</div>

					<div className="space-y-1">
						<div className="text-sm text-muted-foreground flex items-center gap-2">
							<Phone className="w-4 h-4" />
							Phone
						</div>
						<div className="font-medium">{tenant.phone || 'Not provided'}</div>
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
								<Calendar className="w-4 h-4" />
								Created
							</div>
							<div className="font-medium">
								{new Date(tenant.createdAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-muted-foreground flex items-center gap-2">
								<Calendar className="w-4 h-4" />
								Updated
							</div>
							<div className="font-medium">
								{new Date(tenant.updatedAt).toLocaleDateString('en-US', {
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
											<Calendar className="w-3 h-3" />
											{new Date(lease.startDate).toLocaleDateString()} -{' '}
											{new Date(lease.endDate).toLocaleDateString()}
										</span>
										<span>${lease.rentAmount}/mo</span>
									</div>
								</div>
								<Badge
									variant={lease.status === 'ACTIVE' ? 'default' : 'secondary'}
								>
									{lease.status}
								</Badge>
							</div>
						))}
					</div>
				</CardLayout>
			)}
		</div>
	)
}
