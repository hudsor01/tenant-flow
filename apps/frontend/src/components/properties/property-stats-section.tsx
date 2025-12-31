'use client'

import { Building2, Users, DollarSign, Home } from 'lucide-react'
import type { PropertiesSummary } from './types'

interface PropertyStatsSectionProps {
	summary: PropertiesSummary
}

function formatCurrency(amountInCents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amountInCents / 100)
}

export function PropertyStatsSection({ summary }: PropertyStatsSectionProps) {
	return (
		<section className="mb-8">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Overview
				</h2>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Total Properties */}
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Properties</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">
							{summary.totalProperties}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<Building2 className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				{/* Occupancy Rate */}
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Occupancy</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">
							{summary.overallOccupancyRate}%
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<Users className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				{/* Available Units */}
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Available</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">
							{summary.availableUnits}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<Home className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				{/* Monthly Revenue */}
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Monthly Revenue</p>
					</div>
					<div className="flex items-end justify-between">
						<div>
							<p className="text-2xl font-bold text-foreground">
								{formatCurrency(summary.totalMonthlyRevenue)}
							</p>
							{summary.totalUnits > 0 && (
								<p className="text-xs text-muted-foreground">
									{formatCurrency(
										Math.round(summary.totalMonthlyRevenue / summary.totalUnits)
									)}
									/unit avg
								</p>
							)}
						</div>
						<div className="w-9 h-9 rounded-sm bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
							<DollarSign className="w-4 h-4 text-emerald-600" />
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
