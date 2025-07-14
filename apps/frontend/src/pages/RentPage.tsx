import React from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, PlusCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface RentData {
	id: number
	tenantName: string
	property: string
	amount: string
	dueDate: string
	status: 'Paid' | 'Pending' | 'Overdue'
}

interface RentEntryProps {
	tenantName: string
	property: string
	amount: string
	dueDate: string
	status: 'Paid' | 'Pending' | 'Overdue'
}

const RentEntry: React.FC<RentEntryProps> = ({
	tenantName,
	property,
	amount,
	dueDate,
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
					{tenantName}
				</p>
				<p className="text-muted-foreground font-sans text-sm">
					{property}
				</p>
			</div>
			<div className="text-right">
				<p className="text-primary font-sans text-xl font-bold">
					${amount}
				</p>
				<p className="text-muted-foreground font-sans text-xs">
					Due: {dueDate}
				</p>
			</div>
		</div>
		<div className="mt-3 flex items-center justify-between">
			<span
				className={`rounded-full px-3 py-1 font-sans text-xs font-semibold ${
					status === 'Paid'
						? 'bg-green-500/20 text-green-700 dark:text-green-400'
						: status === 'Pending'
							? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
							: 'bg-red-500/20 text-red-700 dark:text-red-400'
				}`}
			>
				{status}
			</span>
			<Button
				variant="outline"
				size="sm"
				className="border-primary text-primary hover:bg-primary/10 font-sans"
			>
				{status === 'Paid' ? 'View Receipt' : 'Record Payment'}
			</Button>
		</div>
	</motion.div>
)

const RentPage: React.FC = () => {
	const rentData: RentData[] = [
		{
			id: 1,
			tenantName: 'Alice Wonderland',
			property: '123 Main St, Apt 2B',
			amount: '1200.00',
			dueDate: '2025-06-01',
			status: 'Paid'
		},
		{
			id: 2,
			tenantName: 'Bob The Builder',
			property: '456 Oak Ave, Unit A',
			amount: '1500.00',
			dueDate: '2025-06-01',
			status: 'Pending'
		},
		{
			id: 3,
			tenantName: 'Charlie Brown',
			property: '789 Pine Ln, Suite 100',
			amount: '950.00',
			dueDate: '2025-05-01',
			status: 'Overdue'
		}
	]

	return (
		<div className="space-y-6 p-1">
			<div className="flex items-center justify-between">
				<motion.h1
					className="text-foreground text-3xl font-bold tracking-tight"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
				>
					Rent Collection
				</motion.h1>
				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
				>
					<Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans">
						<PlusCircle className="mr-2 h-5 w-5" /> Add Rent Entry
					</Button>
				</motion.div>
			</div>

			<Card className="bg-card shadow-lg">
				<CardHeader>
					<CardTitle className="text-foreground flex items-center text-xl">
						<DollarSign className="text-primary mr-2 h-6 w-6" />
						Rent Roll
					</CardTitle>
					<CardDescription className="text-muted-foreground font-sans">
						Overview of rent payments and statuses.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{rentData.map((entry, index) => (
						<motion.div
							key={entry.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
						>
							<RentEntry {...entry} />
						</motion.div>
					))}
				</CardContent>
			</Card>
			{rentData.length === 0 && (
				<motion.div
					className="py-10 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<img
						alt="Empty state illustration for rent collection"
						className="text-muted-foreground mx-auto h-40 w-40"
						src="https://images.unsplash.com/photo-1643101807073-a068d6a1d8e3"
					/>
					<p className="text-muted-foreground mt-4 font-sans text-lg">
						No rent entries found.
					</p>
					<p className="text-muted-foreground font-sans text-sm">
						Start by adding rent entries for your tenants.
					</p>
				</motion.div>
			)}
		</div>
	)
}

export default RentPage
