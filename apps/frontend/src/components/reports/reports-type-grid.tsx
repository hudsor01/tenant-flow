'use client'

import type { ReactNode } from 'react'
import { FileText, DollarSign, Building2, Wrench, Calendar, TrendingUp, Receipt, Users } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { ReportType } from './types'

const iconMap: Record<string, ReactNode> = {
	DollarSign: <DollarSign className="w-6 h-6" />,
	FileText: <FileText className="w-6 h-6" />,
	Building2: <Building2 className="w-6 h-6" />,
	Wrench: <Wrench className="w-6 h-6" />,
	Calendar: <Calendar className="w-6 h-6" />,
	TrendingUp: <TrendingUp className="w-6 h-6" />,
	Receipt: <Receipt className="w-6 h-6" />,
	Users: <Users className="w-6 h-6" />
}

interface ReportsTypeGridProps {
	filteredTypes: ReportType[]
	selectedCategory: 'all' | 'financial' | 'operations'
	onCategoryChange: (category: 'all' | 'financial' | 'operations') => void
	onGenerateReport: ((typeId: string) => void) | undefined
}

export function ReportsTypeGrid({
	filteredTypes,
	selectedCategory,
	onCategoryChange,
	onGenerateReport
}: ReportsTypeGridProps) {
	return (
		<>
			{/* Category Filter */}
			<BlurFade delay={0.6} inView>
				<div className="flex items-center gap-2 mb-6">
					<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
						{(['all', 'financial', 'operations'] as const).map(cat => (
							<button
								key={cat}
								onClick={() => onCategoryChange(cat)}
								className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
									selectedCategory === cat
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								{cat === 'all'
									? 'All Reports'
									: cat.charAt(0).toUpperCase() + cat.slice(1)}
							</button>
						))}
					</div>
					<span className="ml-auto text-sm text-muted-foreground">
						{filteredTypes.length}{' '}
						{filteredTypes.length === 1 ? 'template' : 'templates'}
					</span>
				</div>
			</BlurFade>

			{/* Report Type Cards Grid */}
			<BlurFade delay={0.7} inView>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{filteredTypes.map((type, index) => (
						<BlurFade key={type.id} delay={0.8 + index * 0.05} inView>
							<div className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-sm transition-all group">
								<div className="flex items-start justify-between mb-4">
									<div
										className={`w-12 h-12 rounded-lg flex items-center justify-center ${
											type.category === 'financial'
												? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
												: 'bg-primary/10 text-primary'
										}`}
									>
										{iconMap[type.icon] || <FileText className="w-6 h-6" />}
									</div>
									<span
										className={`text-xs px-2 py-1 rounded-full ${
											type.category === 'financial'
												? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
												: 'bg-muted text-muted-foreground'
										}`}
									>
										{type.category}
									</span>
								</div>
								<h3 className="font-medium text-foreground mb-1">{type.name}</h3>
								<p className="text-sm text-muted-foreground mb-4 line-clamp-2">
									{type.description}
								</p>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1">
										{type.formats.map(fmt => (
											<span
												key={fmt}
												className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground uppercase"
											>
												{fmt}
											</span>
										))}
									</div>
									<button
										onClick={() => onGenerateReport?.(type.id)}
										className="text-sm text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
									>
										Generate
									</button>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</BlurFade>
		</>
	)
}
