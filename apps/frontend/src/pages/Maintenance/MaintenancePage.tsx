import React, { useState } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench, PlusCircle } from 'lucide-react'
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
	const { data } = useMaintenanceRequests()

	// Map real data to component format
<<<<<<< HEAD
	const requestsArray = (data as { requests?: MaintenanceRequestListOutput['requests'] })?.requests || []
=======
	const requestsArray = data?.requests || []
>>>>>>> origin/main
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

	return (
		<div className="space-y-6 p-1">
			<div className="flex items-center justify-between">
				<motion.h1
					className="text-foreground text-3xl font-bold tracking-tight"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
				>
					Maintenance Requests
				</motion.h1>
				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
				>
					<Button
						variant="premium"
						onClick={() => setIsModalOpen(true)}
					>
						<PlusCircle className="mr-2 h-5 w-5" /> New Request
					</Button>
				</motion.div>
			</div>

			<Card className="bg-card shadow-lg">
				<CardHeader>
					<CardTitle className="text-foreground flex items-center text-xl">
						<Wrench className="text-primary mr-2 h-6 w-6" />
						Active Requests
					</CardTitle>
					<CardDescription className="text-muted-foreground font-sans">
						Track and manage maintenance tasks.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{requests.map((request, index) => (
						<motion.div
							key={request.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
						>
							<MaintenanceRequestCard {...request} />
						</motion.div>
					))}
				</CardContent>
			</Card>
			{requests.length === 0 && (
				<motion.div
					className="py-10 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<img
						alt="Empty state illustration for maintenance requests"
						className="text-muted-foreground mx-auto h-40 w-40"
						src="https://images.unsplash.com/photo-1693501063463-c4efd7afa14e"
					/>
					<p className="text-muted-foreground mt-4 font-sans text-lg">
						No maintenance requests found.
					</p>
					<p className="text-muted-foreground font-sans text-sm">
						All clear! No pending maintenance tasks.
					</p>
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
