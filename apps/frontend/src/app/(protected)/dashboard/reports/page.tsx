'use client'

import { MetricsCard } from '@/components/charts/metrics-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Table } from '@/components/ui/table'
import {
	Building,
	Calendar,
	Clock,
	DollarSign,
	Download,
	FileSpreadsheet,
	FileText,
	Filter,
	Mail,
	Plus,
	Printer,
	Search,
	TrendingUp,
	Users
} from 'lucide-react'

const availableReports = [
	{
		title: 'Monthly Financial Summary',
		description: 'Comprehensive revenue, expenses, and profit analysis',
		category: 'Financial',
		lastGenerated: '2024-01-15',
		frequency: 'Monthly',
		format: 'PDF',
		icon: DollarSign,
		color: 'var(--chart-1)'
	},
	{
		title: 'Occupancy Rate Analysis',
		description: 'Detailed breakdown of unit occupancy across properties',
		category: 'Operations',
		lastGenerated: '2024-01-14',
		frequency: 'Weekly',
		format: 'Excel',
		icon: Users,
		color: 'var(--chart-2)'
	},
	{
		title: 'Property Performance Report',
		description: 'Individual property metrics and comparative analysis',
		category: 'Performance',
		lastGenerated: '2024-01-13',
		frequency: 'Monthly',
		format: 'PDF',
		icon: Building,
		color: 'var(--chart-3)'
	},
	{
		title: 'Lease Expiration Forecast',
		description: 'Upcoming lease renewals and vacancy predictions',
		category: 'Planning',
		lastGenerated: '2024-01-12',
		frequency: 'Quarterly',
		format: 'Excel',
		icon: Calendar,
		color: 'var(--chart-4)'
	},
	{
		title: 'Maintenance Cost Analysis',
		description: 'Breakdown of maintenance expenses by category and property',
		category: 'Operations',
		lastGenerated: '2024-01-10',
		frequency: 'Monthly',
		format: 'PDF',
		icon: FileText,
		color: 'var(--chart-5)'
	},
	{
		title: 'Tenant Satisfaction Survey',
		description: 'Compiled feedback and satisfaction metrics from tenants',
		category: 'Quality',
		lastGenerated: '2024-01-08',
		frequency: 'Quarterly',
		format: 'PDF',
		icon: TrendingUp,
		color: 'var(--chart-1)'
	}
]

const recentReports = [
	{
		name: 'January Financial Summary',
		date: '2024-01-15',
		size: '2.4 MB',
		status: 'Ready'
	},
	{
		name: 'Q4 2023 Portfolio Review',
		date: '2024-01-10',
		size: '5.1 MB',
		status: 'Ready'
	},
	{
		name: 'December Occupancy Report',
		date: '2024-01-05',
		size: '1.8 MB',
		status: 'Ready'
	},
	{
		name: 'Year-End Tax Summary',
		date: '2023-12-31',
		size: '3.2 MB',
		status: 'Ready'
	}
]

export default function ReportsPage() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gradient-authority">
						Reports & Analytics
					</h1>
					<p className="text-muted-foreground mt-1">
						Generate, schedule, and manage comprehensive business reports
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<Filter className="size-4 mr-2" />
						Filter
					</Button>
					<Button size="sm">
						<Plus className="size-4 mr-2" />
						New Report
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<MetricsCard
					title="Total Reports"
					value="248"
					description="Generated this year"
					icon={FileText}
					colorVariant="info"
				/>

				<MetricsCard
					title="Scheduled"
					value="12"
					description="Automatic reports active"
					icon={Clock}
					colorVariant="warning"
				/>

				<MetricsCard
					title="Downloads"
					value="89"
					description="Past 30 days"
					icon={Download}
					colorVariant="success"
				/>

				<MetricsCard
					title="Pending"
					value="3"
					description="Currently processing"
					icon={Clock}
					colorVariant="warning"
				/>
			</div>

			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
						<Input placeholder="Search reports..." className="pl-10 w-72" />
					</div>
					<Select defaultValue="all">
						<SelectTrigger className="w-48">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Categories</SelectItem>
							<SelectItem value="financial">Financial</SelectItem>
							<SelectItem value="operations">Operations</SelectItem>
							<SelectItem value="performance">Performance</SelectItem>
							<SelectItem value="planning">Planning</SelectItem>
							<SelectItem value="quality">Quality</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<Select defaultValue="all">
						<SelectTrigger className="w-36">
							<SelectValue placeholder="Frequency" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Frequencies</SelectItem>
							<SelectItem value="daily">Daily</SelectItem>
							<SelectItem value="weekly">Weekly</SelectItem>
							<SelectItem value="monthly">Monthly</SelectItem>
							<SelectItem value="quarterly">Quarterly</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<h2 className="text-xl font-semibold mb-4">Available Reports</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{availableReports.map((report, index) => (
						<Card
							key={index}
							className="p-6 border shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex items-start gap-3 mb-4">
								<div
									className="w-12 h-12 rounded-lg flex items-center justify-center"
									style={{
										backgroundColor: `color-mix(in oklab, ${report.color} 15%, transparent)`
									}}
								>
									<report.icon
										className="size-6"
										style={{ color: report.color }}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-sm leading-tight">
										{report.title}
									</h3>
									<Badge variant="secondary" className="mt-1 text-xs">
										{report.category}
									</Badge>
								</div>
							</div>
							<p className="text-muted-foreground text-sm mb-4 leading-relaxed">
								{report.description}
							</p>
							<div className="space-y-2 mb-4">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Last Generated:</span>
									<span>{report.lastGenerated}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Frequency:</span>
									<span>{report.frequency}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Format:</span>
									<span>{report.format}</span>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Button size="sm" className="flex-1">
									<Download className="size-4 mr-2" />
									Generate
								</Button>
								<Button variant="outline" size="sm">
									<Printer className="size-4" />
								</Button>
								<Button variant="outline" size="sm">
									<Mail className="size-4" />
								</Button>
							</div>
						</Card>
					))}
				</div>
			</div>

			<Card className="border shadow-sm">
				<div className="p-6 border-b">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold">Recent Reports</h2>
							<p className="text-muted-foreground text-sm">
								Recently generated and downloaded reports
							</p>
						</div>
						<Button variant="outline" size="sm">
							<FileSpreadsheet className="size-4 mr-2" />
							View All
						</Button>
					</div>
				</div>
				<div className="p-6">
					<div className="overflow-x-auto">
						<Table>
							<thead>
								<tr className="border-b">
									<th className="text-left font-semibold p-3">Report Name</th>
									<th className="text-left font-semibold p-3">Generated</th>
									<th className="text-left font-semibold p-3">Size</th>
									<th className="text-left font-semibold p-3">Status</th>
									<th className="text-left font-semibold p-3">Actions</th>
								</tr>
							</thead>
							<tbody>
								{recentReports.map((report, index) => (
									<tr
										key={index}
										className="border-b hover:bg-muted/30 transition-colors"
									>
										<td className="p-3">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-md flex items-center justify-center bg-muted">
													<FileText className="size-4 text-muted-foreground" />
												</div>
												<span className="font-medium">{report.name}</span>
											</div>
										</td>
										<td className="p-3 text-muted-foreground">{report.date}</td>
										<td className="p-3 text-muted-foreground">{report.size}</td>
										<td className="p-3">
											<Badge variant="default" className="text-xs">
												{report.status}
											</Badge>
										</td>
										<td className="p-3">
											<div className="flex items-center gap-2">
												<Button variant="ghost" size="sm">
													<Download className="size-4" />
												</Button>
												<Button variant="ghost" size="sm">
													<Mail className="size-4" />
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
					</div>

					<div className="mt-8">
						<h3 className="text-lg font-semibold mb-4">Report Archive</h3>
						<div className="space-y-3">
							{recentReports.slice(0, 2).map((report, index) => (
								<div
									key={`archive-${index}`}
									className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
								>
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-lg flex items-center justify-center bg-background border">
											<FileText className="size-5 text-muted-foreground" />
										</div>
										<div>
											<p className="font-medium">{report.name}</p>
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<span>{report.date}</span>
												<span>{report.size}</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="text-xs">
											Archived
										</Badge>
										<Button variant="ghost" size="sm">
											<Download className="size-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}
