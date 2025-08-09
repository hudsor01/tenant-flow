import { motion } from '@/lib/framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Home, UserCheck, UserX } from 'lucide-react'
import { formatCurrency } from '@repo/shared'

interface PropertyStatsSectionProps {
	stats: {
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		occupancyRate: number
		totalMonthlyRent: number
		potentialRent: number
	}
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
	}
}

/**
 * Property overview statistics section with key metrics cards
 * Displays total units, occupancy, vacancy, and revenue information
 */
export default function PropertyStatsSection({
	stats,
	fadeInUp
}: PropertyStatsSectionProps) {
	return (
		<motion.div
			{...fadeInUp}
			transition={{ delay: 0.2 }}
			className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
		>
			<Card>
				<CardContent className="flex items-center p-6">
					<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
						<Home className="h-6 w-6 text-blue-600" />
					</div>
					<div>
						<p className="text-muted-foreground text-sm">
							Total Units
						</p>
						<p className="text-2xl font-bold">{stats.totalUnits}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex items-center p-6">
					<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
						<UserCheck className="h-6 w-6 text-green-600" />
					</div>
					<div>
						<p className="text-muted-foreground text-sm">
							Occupied
						</p>
						<p className="text-2xl font-bold">
							{stats.occupiedUnits}
						</p>
						<p className="text-xs text-green-600">
							{stats.occupancyRate}% occupancy
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex items-center p-6">
					<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
						<UserX className="h-6 w-6 text-orange-600" />
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Vacant</p>
						<p className="text-2xl font-bold">
							{stats.vacantUnits}
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex items-center p-6">
					<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
						<DollarSign className="h-6 w-6 text-purple-600" />
					</div>
					<div>
						<p className="text-muted-foreground text-sm">
							Monthly Revenue
						</p>
						<p className="text-2xl font-bold">
							${formatCurrency(stats.totalMonthlyRent)}
						</p>
						<p className="text-muted-foreground text-xs">
							of ${formatCurrency(stats.potentialRent)}
						</p>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}
