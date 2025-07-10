import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@/components/ui/tabs'
import {
	Users,
	Mail,
	Phone,
	MapPin,
	Eye,
	FileText,
	Wrench,
	Clock,
	DollarSign,
	Calendar,
	Building,
	CheckCircle,
	AlertCircle,
	XCircle,
	MoreVertical,
	Trash2,
	UserX
} from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import type { Tenant } from '@/types/entities'
import type { LeaseWithDetails, MaintenanceWithDetails } from '@/types/api'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useDeleteTenant } from '@/hooks/useTenants'
import { toast } from 'sonner'

interface TenantCardProps {
	tenant: Tenant & {
		leases?: LeaseWithDetails[]
		maintenanceRequests?: MaintenanceWithDetails[]
	}
	onViewDetails: (tenant: Tenant & { leases?: LeaseWithDetails[]; maintenanceRequests?: MaintenanceWithDetails[] }) => void
	delay?: number
}

interface DataRowProps {
	label: string
	value: string | React.ReactNode
	icon?: React.ReactNode
}

const DataRow: React.FC<DataRowProps> = ({ label, value, icon }) => (
	<div className="border-border/50 flex items-center justify-between border-b py-2 last:border-b-0">
		<div className="text-muted-foreground flex items-center gap-2 text-sm">
			{icon && <span className="text-muted-foreground">{icon}</span>}
			<span className="font-medium">{label}</span>
		</div>
		<div className="text-foreground text-sm font-medium">{value}</div>
	</div>
)

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
	const getStatusStyle = (status: string) => {
		switch (status.toLowerCase()) {
			case 'active':
				return {
					variant: 'default' as const,
					icon: <CheckCircle className="h-3 w-3" />
				}
			case 'pending':
				return {
					variant: 'secondary' as const,
					icon: <Clock className="h-3 w-3" />
				}
			case 'completed':
				return {
					variant: 'outline' as const,
					icon: <CheckCircle className="h-3 w-3" />
				}
			case 'high':
				return {
					variant: 'destructive' as const,
					icon: <AlertCircle className="h-3 w-3" />
				}
			case 'medium':
				return {
					variant: 'secondary' as const,
					icon: <AlertCircle className="h-3 w-3" />
				}
			case 'low':
				return {
					variant: 'outline' as const,
					icon: <AlertCircle className="h-3 w-3" />
				}
			default:
				return {
					variant: 'secondary' as const,
					icon: <XCircle className="h-3 w-3" />
				}
		}
	}

	const { variant, icon } = getStatusStyle(status)

	return (
		<Badge variant={variant} className="flex items-center gap-1 text-xs">
			{icon}
			{status}
		</Badge>
	)
}

export const TenantCard: React.FC<TenantCardProps> = ({
	tenant,
	onViewDetails,
	delay = 0
}) => {
	const [activeTab, setActiveTab] = useState('overview')
	const deleteTenant = useDeleteTenant()

	// Get active lease
	const activeLease = tenant.leases?.find(lease => lease.status === 'ACTIVE')
	const leaseHistory =
		tenant.leases?.sort(
			(a, b) =>
				new Date(b.startDate).getTime() -
				new Date(a.startDate).getTime()
		) || []
	const maintenanceRequests =
		tenant.maintenanceRequests?.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() -
				new Date(a.createdAt).getTime()
		) || []

	const handleDeleteTenant = async () => {
		const isPending = tenant.invitationStatus === 'PENDING'
		const isAccepted = tenant.invitationStatus === 'ACCEPTED'

		let confirmMessage: string
		if (isPending) {
			confirmMessage = `Are you sure you want to delete the pending invitation for ${tenant.name}? This will permanently remove the invitation and cannot be undone.`
		} else if (isAccepted) {
			confirmMessage = `Are you sure you want to deactivate ${tenant.name}? This will mark them as inactive but preserve all historical data.`
		} else {
			toast.error('Cannot manage tenant with current status')
			return
		}

		if (window.confirm(confirmMessage)) {
			try {
				await deleteTenant.mutateAsync(tenant.id)

				if (isPending) {
					toast.success(
						`Pending invitation for ${tenant.name} has been deleted`
					)
				} else if (isAccepted) {
					toast.success(`${tenant.name} has been marked as inactive`)
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to manage tenant'
				toast.error(message)
				console.error('Delete tenant error:', error)
			}
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay }}
		>
			<Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg">
				{/* Header */}
				<CardHeader className="pb-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center space-x-3">
							<div className="relative">
								<div className="from-primary/20 to-primary/10 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br">
									<Users className="text-primary h-6 w-6" />
								</div>
								{/* Status indicator dot */}
								<div
									className={`border-background absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 ${
										tenant.invitationStatus === 'ACCEPTED'
											? 'bg-green-500'
											: tenant.invitationStatus ===
												  'PENDING'
												? 'bg-yellow-500'
												: 'bg-gray-400'
									}`}
								/>
							</div>
							<div>
								<h3 className="text-foreground group-hover:text-primary text-lg font-semibold transition-colors">
									{tenant.name}
								</h3>
								<div className="mt-1 flex items-center gap-2">
									<Badge
										variant={
											tenant.invitationStatus ===
											'ACCEPTED'
												? 'default'
												: 'secondary'
										}
										className="text-xs"
									>
										{tenant.invitationStatus}
									</Badge>
									{activeLease && (
										<Badge
											variant="outline"
											className="text-xs"
										>
											Active Lease
										</Badge>
									)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
							<Button
								variant="ghost"
								size="sm"
								onClick={e => {
									e.stopPropagation()
									onViewDetails(tenant)
								}}
							>
								<Eye className="h-4 w-4" />
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={e => e.stopPropagation()}
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-48"
								>
									<DropdownMenuLabel>
										Tenant Actions
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => onViewDetails(tenant)}
									>
										<Eye className="mr-2 h-4 w-4" />
										View Details
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									{tenant.invitationStatus === 'PENDING' ? (
										<DropdownMenuItem
											onClick={handleDeleteTenant}
											className="text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Delete Invitation
										</DropdownMenuItem>
									) : tenant.invitationStatus ===
									  'ACCEPTED' ? (
										<DropdownMenuItem
											onClick={handleDeleteTenant}
											className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
										>
											<UserX className="mr-2 h-4 w-4" />
											Mark as Inactive
										</DropdownMenuItem>
									) : null}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardHeader>

				{/* Tabbed Content */}
				<CardContent className="pt-0">
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className="mb-4 grid h-12 w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3">
							<TabsTrigger value="overview" className="flex items-center gap-2">
								<Users className="h-4 w-4" />
								Overview
							</TabsTrigger>
							<TabsTrigger value="leases" className="flex items-center gap-2">
								<FileText className="h-4 w-4" />
								Leases
							</TabsTrigger>
							<TabsTrigger value="maintenance" className="flex items-center gap-2">
								<Wrench className="h-4 w-4" />
								Maintenance
							</TabsTrigger>
						</TabsList>

						{/* Overview Tab - Personal Information */}
						<TabsContent value="overview" className="mt-0">
							<div className="space-y-1">
								<DataRow
									label="Email"
									value={tenant.email}
									icon={<Mail className="h-4 w-4" />}
								/>
								{tenant.phone && (
									<DataRow
										label="Phone"
										value={tenant.phone}
										icon={<Phone className="h-4 w-4" />}
									/>
								)}
								{activeLease?.unit?.property && (
									<>
										<DataRow
											label="Property"
											value={`${activeLease.unit.property.name} - Unit ${activeLease.unit.unitNumber}`}
											icon={
												<Building className="h-4 w-4" />
											}
										/>
										<DataRow
											label="Location"
											value={`${activeLease.unit.property.city}, ${activeLease.unit.property.state}`}
											icon={
												<MapPin className="h-4 w-4" />
											}
										/>
										<DataRow
											label="Monthly Rent"
											value={`$${activeLease.rentAmount.toLocaleString()}`}
											icon={
												<DollarSign className="h-4 w-4" />
											}
										/>
										<DataRow
											label="Lease End"
											value={format(
												new Date(activeLease.endDate),
												'MMM d, yyyy'
											)}
											icon={
												<Calendar className="h-4 w-4" />
											}
										/>
									</>
								)}
								{!activeLease && (
									<div className="text-muted-foreground py-4 text-center text-sm">
										No active lease
									</div>
								)}
							</div>
						</TabsContent>

						{/* Leases Tab - Timeline of Lease History */}
						<TabsContent value="leases" className="mt-0">
							{leaseHistory.length > 0 ? (
								<div className="max-h-48 space-y-3 overflow-y-auto">
									{leaseHistory.map((lease, index) => (
										<div
											key={lease.id}
											className="relative"
										>
											{/* Timeline connector */}
											{index <
												leaseHistory.length - 1 && (
												<div className="bg-border absolute top-8 bottom-0 left-4 w-px" />
											)}

											<div className="flex items-start gap-3">
												<div
													className={`mt-1 h-3 w-3 rounded-full ${
														lease.status ===
														'ACTIVE'
															? 'bg-green-500'
															: lease.status ===
																  'COMPLETED'
																? 'bg-blue-500'
																: 'bg-gray-400'
													}`}
												/>
												<div className="flex-1 space-y-1">
													<div className="flex items-center justify-between">
														<div className="text-sm font-medium">
															{
																lease.unit
																	?.property
																	?.name
															}{' '}
															- Unit{' '}
															{
																lease.unit
																	?.unitNumber
															}
														</div>
														<StatusBadge
															status={
																lease.status
															}
														/>
													</div>
													<div className="text-muted-foreground text-xs">
														{format(
															new Date(
																lease.startDate
															),
															'MMM d, yyyy'
														)}{' '}
														-{' '}
														{format(
															new Date(
																lease.endDate
															),
															'MMM d, yyyy'
														)}
													</div>
													<div className="text-muted-foreground text-xs">
														$
														{lease.rentAmount.toLocaleString()}
														/month
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-muted-foreground py-8 text-center text-sm">
									<FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
									No lease history
								</div>
							)}
						</TabsContent>

						{/* Maintenance Tab - Maintenance Requests */}
						<TabsContent value="maintenance" className="mt-0">
							{maintenanceRequests.length > 0 ? (
								<div className="max-h-48 space-y-3 overflow-y-auto">
									{maintenanceRequests
										.slice(0, 3)
										.map(request => (
											<div
												key={request.id}
												className="border-border/50 rounded-lg border p-3"
											>
												<div className="mb-2 flex items-center justify-between">
													<div className="text-sm font-medium">
														{request.title}
													</div>
													<div className="flex items-center gap-1">
														<StatusBadge
															status={
																request.priority
															}
														/>
														<StatusBadge
															status={
																request.status
															}
														/>
													</div>
												</div>
												<div className="text-muted-foreground line-clamp-2 text-xs">
													{request.description}
												</div>
												<div className="text-muted-foreground mt-1 text-xs">
													{format(
														new Date(
															request.createdAt
														),
														'MMM d, yyyy'
													)}
												</div>
											</div>
										))}
									{maintenanceRequests.length > 3 && (
										<div className="text-muted-foreground text-center text-xs">
											+{maintenanceRequests.length - 3}{' '}
											more requests
										</div>
									)}
								</div>
							) : (
								<div className="text-muted-foreground py-8 text-center text-sm">
									<Wrench className="mx-auto mb-2 h-8 w-8 opacity-50" />
									No maintenance requests
								</div>
							)}
						</TabsContent>
					</Tabs>

					{/* Action Buttons */}
					<div className="border-border/50 mt-4 flex gap-2 border-t pt-4">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={e => {
								e.stopPropagation()
								onViewDetails(tenant)
							}}
						>
							<Eye className="mr-1 h-4 w-4" />
							View Details
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={e => {
								e.stopPropagation()
								window.location.href = `mailto:${tenant.email}`
							}}
						>
							<Mail className="h-4 w-4" />
						</Button>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}

export default TenantCard
