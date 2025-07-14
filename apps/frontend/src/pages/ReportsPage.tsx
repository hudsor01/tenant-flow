import React from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Download } from 'lucide-react'
import { motion } from 'framer-motion'

interface Report {
	title: string
	description: string
	lastGenerated: string | null
}

interface ReportItemProps {
	title: string
	description: string
	lastGenerated: string | null
}

const ReportItem: React.FC<ReportItemProps> = ({
	title,
	description,
	lastGenerated
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
		<div className="flex items-center justify-between">
			<div>
				<p className="text-foreground font-sans text-lg font-semibold">
					{title}
				</p>
				<p className="text-muted-foreground font-sans text-sm">
					{description}
				</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				className="border-primary text-primary hover:bg-primary/10 font-sans"
			>
				<Download className="mr-2 h-4 w-4" /> Generate
			</Button>
		</div>
		<p className="text-muted-foreground mt-2 font-sans text-xs">
			Last generated: {lastGenerated || 'Never'}
		</p>
	</motion.div>
)

const ReportsPage: React.FC = () => {
	const reports: Report[] = [
		{
			title: 'Financial Summary',
			description: 'Overview of income, expenses, and profit.',
			lastGenerated: '2025-05-01'
		},
		{
			title: 'Occupancy Report',
			description: 'Details on vacant and occupied units.',
			lastGenerated: '2025-05-28'
		},
		{
			title: 'Rent Arrears',
			description: 'List of tenants with overdue rent.',
			lastGenerated: '2025-05-25'
		},
		{
			title: 'Maintenance History',
			description: 'Log of all maintenance activities.',
			lastGenerated: '2025-05-20'
		}
	]

	return (
		<div className="space-y-6 p-1">
			<motion.h1
				className="text-foreground text-3xl font-bold tracking-tight"
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.5 }}
			>
				Reports
			</motion.h1>

			<Card className="bg-card shadow-lg">
				<CardHeader>
					<CardTitle className="text-foreground flex items-center text-xl">
						<BarChart3 className="text-primary mr-2 h-6 w-6" />
						Available Reports
					</CardTitle>
					<CardDescription className="text-muted-foreground font-sans">
						Generate and download various property management
						reports.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{reports.map((report, index) => (
						<motion.div
							key={report.title}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
						>
							<ReportItem {...report} />
						</motion.div>
					))}
				</CardContent>
			</Card>
			{reports.length === 0 && (
				<motion.div
					className="py-10 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<img
						alt="Empty state illustration for reports"
						className="text-muted-foreground mx-auto h-40 w-40"
						src="https://images.unsplash.com/photo-1596774419796-0318e0ab4ba1"
					/>
					<p className="text-muted-foreground mt-4 font-sans text-lg">
						No report types configured.
					</p>
					<p className="text-muted-foreground font-sans text-sm">
						Contact support to set up report templates.
					</p>
				</motion.div>
			)}
		</div>
	)
}

export default ReportsPage
