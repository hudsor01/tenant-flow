import React, { useState } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Wrench, PlusCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import MaintenanceRequestModal from '@/components/modals/MaintenanceRequestModal'
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests'
import type { RouterOutputs } from '@tenantflow/shared'

type MaintenanceRequestListOutput = RouterOutputs['maintenance']['list']

interface MaintenanceRequestData {
	id: number
	property: string
	issue: string
	reportedDate: string
	status: 'Completed' | 'In Progress' | 'Open'
}

interface MaintenanceRequestProps {
	id: number
	property: string
	issue: string
	reportedDate: string
	status: 'Completed' | 'In Progress' | 'Open'
}

const MaintenanceRequestCard: React.FC<MaintenanceRequestProps> = ({
	property,
	issue,
	reportedDate,
	status
}) => (
	<motion.div
		className="bg-card rounded-lg p-4 shadow transition-shadow hover:shadow-md"
		initial={{ opacity: 0, y: 15 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.3 }}
		whileHover={{
			backgroundColor: 'hsl(var(--accent))',
			transition: { duration: 0.15 }
		}}
	>
		<div className="flex items-start justify-between">
			<div>
				<p className="text-foreground font-sans text-lg font-semibold">
					{property}
				</p>
				<p className="text-muted-foreground font-sans text-sm">
					{issue}
				</p>
			</div>
			<div className="text-right">
				<p className="text-muted-foreground font-sans text-xs">
					Reported: {reportedDate}
				</p>
				<span
					className={`mt-1 inline-block rounded-full px-3 py-1 font-sans text-xs font-semibold ${
						status === 'Completed'
							? 'bg-green-500/20 text-green-700 dark:text-green-400'
							: status === 'In Progress'
								? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
								: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' // Open
					}`}
				>
					{status}
				</span>
			</div>
		</div>
		<div className="mt-3 flex justify-end">
			<Button variant="link" size="sm" className="text-primary font-sans">
				View Details
			</Button>
		</div>
	</motion.div>
)

const MaintenancePage: React.FC = () => {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const { data, isLoading, error } = useMaintenanceRequests()

	// Map real data to component format
	const requestsArray = data?.requests || []
	const requests: MaintenanceRequestData[] = requestsArray.map((req: MaintenanceRequestListOutput['requests'][0]) => ({
		id: Number(req.id),
		property: req.Unit?.Property?.name || 'Unknown Property',
		issue: req.title,
		reportedDate: new Date(req.createdAt).toLocaleDateString(),
		status:
			req.status === 'OPEN'
				? 'Open'
				: req.status === 'IN_PROGRESS'
					? 'In Progress'
					: 'Completed'
	}))

	// Handle error state
	if (error) {
		return (
			<div className="flex min-h-[400px] items-center justify-center p-8">
				<Card className="w-full max-w-md text-center">
					<CardHeader>
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="h-6 w-6 text-destructive" />
						</div>
						<CardTitle className="text-lg font-semibold text-foreground">
							Unable to load maintenance requests
						</CardTitle>
						<CardDescription className="mt-2">
							There was a problem loading your maintenance requests. Please try again.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button 
							onClick={() => window.location.reload()}
							variant="outline"
							className="w-full"
						>
							Refresh Page
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="space-y-6 p-1">
			{/* Header with loading states */}
			<div className="flex items-center justify-between">
				{isLoading ? (
					<Skeleton className="h-9 w-64" />
				) : (
					<motion.h1
						className="text-foreground text-3xl font-bold tracking-tight"
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5 }}
					>
						Maintenance Requests
					</motion.h1>
				)}
				{isLoading ? (
					<Skeleton className="h-10 w-32" />
				) : (
					<motion.div
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
					>
						<Button
							variant="premium"
							onClick={() => setIsModalOpen(true)}
							disabled={isLoading}
						>
							<PlusCircle className="mr-2 h-5 w-5" /> New Request
						</Button>
					</motion.div>
				)}
			</div>

			{/* Main content with loading states */}
			<Card className="bg-card shadow-lg">
				<CardHeader>
					{isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-64" />
						</div>
					) : (
						<>
							<CardTitle className="text-foreground flex items-center text-xl">
								<Wrench className="text-primary mr-2 h-6 w-6" />
								Active Requests
							</CardTitle>
							<CardDescription className="text-muted-foreground font-sans">
								Track and manage maintenance tasks.
							</CardDescription>
						</>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						// Loading skeleton for maintenance requests
						<div className="space-y-4">
							{[...Array(3)].map((_, i) => (
								<Card key={i} className="p-4">
									<div className="flex items-start justify-between">
										<div className="space-y-2 flex-1">
											<Skeleton className="h-5 w-3/4" />
											<Skeleton className="h-4 w-1/2" />
										</div>
										<div className="space-y-2 text-right">
											<Skeleton className="h-3 w-20" />
											<Skeleton className="h-6 w-16 rounded-full" />
										</div>
									</div>
									<div className="mt-3 flex justify-end">
										<Skeleton className="h-8 w-24" />
									</div>
								</Card>
							))}
						</div>
					) : (
						// Actual maintenance requests
						requests.map((request, index) => (
							<motion.div
								key={request.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
							>
								<MaintenanceRequestCard {...request} />
							</motion.div>
						))
					)}
				</CardContent>
			</Card>
			{/* Empty state - only show when not loading and no requests */}
			{!isLoading && requests.length === 0 && (
				<motion.div
					className="py-16 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<div className="text-muted-foreground mx-auto mb-4 h-32 w-32">
						<Wrench className="h-full w-full" />
					</div>
					<h3 className="text-foreground mt-4 text-lg font-semibold">
						No maintenance requests found
					</h3>
					<p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
						All clear! No pending maintenance tasks. Create your first request to get started.
					</p>
					<Button 
						onClick={() => setIsModalOpen(true)}
						className="mt-6"
					>
						<PlusCircle className="mr-2 h-4 w-4" />
						Create First Request
					</Button>
				</motion.div>
			)}

			<MaintenanceRequestModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</div>
	)
}

export default MaintenancePage
