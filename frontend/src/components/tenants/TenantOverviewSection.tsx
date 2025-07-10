import { motion } from 'framer-motion'
import { FileText, DollarSign, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'

interface TenantOverviewSectionProps {
	tenant: {
		name: string
		email: string
		phone?: string | null
		createdAt: string
		invitationStatus: string
	}
	stats: {
		totalPayments: number
		totalLeases: number
		activeLeases: number
	}
	currentLeaseInfo: {
		currentLease?: {
			id: string
			startDate: string
			endDate: string
			rent: number
		}
		currentUnit?: { id: string; unitNumber: string }
		currentProperty?: { id: string; name: string; address: string }
	}
}

/**
 * Tenant overview section displaying statistics and basic information
 * Shows payment stats, lease counts, personal info, and current lease details
 */
export default function TenantOverviewSection({
	tenant,
	stats,
	currentLeaseInfo
}: TenantOverviewSectionProps) {
	const { currentLease, currentUnit, currentProperty } = currentLeaseInfo

	return (
		<>
			{/* Statistics Cards */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="grid grid-cols-1 gap-6 md:grid-cols-3"
			>
				<Card>
					<CardContent className="flex items-center p-6">
						<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
							<FileText className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-sm">
								Total Leases
							</p>
							<p className="text-2xl font-bold">
								{stats.totalLeases}
							</p>
							<p className="text-muted-foreground text-xs">
								{stats.activeLeases} active
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center p-6">
						<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
							<DollarSign className="h-6 w-6 text-green-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-sm">
								Total Payments
							</p>
							<p className="text-2xl font-bold">
								${stats.totalPayments.toLocaleString()}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center p-6">
						<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
							<Calendar className="h-6 w-6 text-purple-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-sm">
								Member Since
							</p>
							<p className="text-lg font-bold">
								{format(new Date(tenant.createdAt), 'MMM yyyy')}
							</p>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Overview Tab Content */}
			<TabsContent value="overview" className="space-y-4">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{/* Personal Information */}
					<Card>
						<CardHeader>
							<CardTitle>Personal Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-muted-foreground text-sm">
									Full Name
								</p>
								<p className="font-medium">{tenant.name}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-sm">
									Email
								</p>
								<p className="font-medium">{tenant.email}</p>
							</div>
							{tenant.phone && (
								<div>
									<p className="text-muted-foreground text-sm">
										Phone
									</p>
									<p className="font-medium">
										{tenant.phone}
									</p>
								</div>
							)}
							<div>
								<p className="text-muted-foreground text-sm">
									Account Status
								</p>
								<Badge
									variant={
										tenant.invitationStatus === 'ACCEPTED'
											? 'default'
											: 'secondary'
									}
								>
									{tenant.invitationStatus}
								</Badge>
							</div>
						</CardContent>
					</Card>

					{/* Current Lease Info */}
					{currentLease && currentUnit && currentProperty && (
						<Card>
							<CardHeader>
								<CardTitle>Current Lease</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<p className="text-muted-foreground text-sm">
										Property
									</p>
									<p className="font-medium">
										{currentProperty.name}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-sm">
										Unit
									</p>
									<p className="font-medium">
										Unit {currentUnit.unitNumber}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-sm">
										Monthly Rent
									</p>
									<p className="font-medium text-green-600">
										$
										{currentLease.rent.toLocaleString()}
										/mo
									</p>
								</div>
								<div>
									<p className="text-muted-foreground text-sm">
										Lease Period
									</p>
									<p className="font-medium">
										{format(
											new Date(currentLease.startDate),
											'MMM d, yyyy'
										)}{' '}
										-
										{format(
											new Date(currentLease.endDate),
											'MMM d, yyyy'
										)}
									</p>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</TabsContent>
		</>
	)
}
