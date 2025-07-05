import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Phone, MoreVertical, Home } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface TenantHeaderSectionProps {
	tenant: {
		name: string
		email: string
		phone?: string
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
	onBackToTenants: () => void
	onSendEmail: () => void
	onCall: () => void
}

/**
 * Tenant detail header section with navigation, contact info, and actions
 * Displays tenant name, contact details, actions menu, and current residence alert
 */
export default function TenantHeaderSection({
	tenant,
	currentLeaseInfo,
	onBackToTenants,
	onSendEmail,
	onCall
}: TenantHeaderSectionProps) {
	const { currentLease, currentUnit, currentProperty } = currentLeaseInfo

	return (
		<>
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex items-center justify-between"
			>
				<div className="flex items-center space-x-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={onBackToTenants}
						className="hover:bg-accent"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							{tenant.name}
						</h1>
						<div className="mt-1 flex items-center space-x-4">
							<div className="text-muted-foreground flex items-center">
								<Mail className="mr-1 h-4 w-4" />
								<span className="text-sm">{tenant.email}</span>
							</div>
							{tenant.phone && (
								<div className="text-muted-foreground flex items-center">
									<Phone className="mr-1 h-4 w-4" />
									<span className="text-sm">
										{tenant.phone}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="icon">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onSendEmail}>
							<Mail className="mr-2 h-4 w-4" />
							Send Email
						</DropdownMenuItem>
						{tenant.phone && (
							<DropdownMenuItem onClick={onCall}>
								<Phone className="mr-2 h-4 w-4" />
								Call Tenant
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</motion.div>

			{/* Current Lease Alert */}
			{currentLease && currentUnit && currentProperty && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<Alert>
						<Home className="h-4 w-4" />
						<AlertTitle>Current Residence</AlertTitle>
						<AlertDescription>
							{currentProperty.name} - Unit{' '}
							{currentUnit.unitNumber} - Lease expires{' '}
							{format(
								new Date(currentLease.endDate),
								'MMMM d, yyyy'
							)}
							(
							{formatDistanceToNow(
								new Date(currentLease.endDate),
								{ addSuffix: true }
							)}
							)
						</AlertDescription>
					</Alert>
				</motion.div>
			)}
		</>
	)
}
