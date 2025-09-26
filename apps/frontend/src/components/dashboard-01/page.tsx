import { getDashboardStats } from '@/app/actions/dashboard'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ChartAreaInteractive } from './chart-area-interactive'
import { DataTable } from './data-table'
import { SectionCards } from './section-cards'

interface DashboardPageProps {
	className?: string
}

export async function DashboardPage({
	className: _className
}: DashboardPageProps) {
	// Fetch dashboard data
	const result = await getDashboardStats()
	const stats = result.success ? result.data : undefined

	// Mock data for demo purposes
	const chartData = [
		{ date: '2024-01', revenue: 5400, expenses: 2400 },
		{ date: '2024-02', revenue: 5700, expenses: 2600 },
		{ date: '2024-03', revenue: 6100, expenses: 2800 },
		{ date: '2024-04', revenue: 6400, expenses: 3000 },
		{ date: '2024-05', revenue: 6800, expenses: 3200 },
		{ date: '2024-06', revenue: 7200, expenses: 3400 }
	]

	const activityData = [
		{
			type: 'Property',
			action: 'Added',
			details: 'New property at 123 Main St',
			timestamp: new Date().toISOString()
		},
		{
			type: 'Tenant',
			action: 'Updated',
			details: 'Lease renewal for Apt 4B',
			timestamp: new Date().toISOString()
		},
		{
			type: 'Maintenance',
			action: 'Completed',
			details: 'Fixed heating in Unit 12',
			timestamp: new Date().toISOString()
		}
	]

	return (
		<>
			{/* Header */}
			<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink href="/">TenantFlow</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Dashboard</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				{/* Stats Cards */}
				<SectionCards data={stats} />

				{/* Chart and Table Grid */}
				<div className="grid auto-rows-min gap-4 md:grid-cols-3">
					<div className="aspect-video rounded-xl bg-muted/50 md:col-span-2">
						<ChartAreaInteractive data={chartData} />
					</div>
					<div className="md:col-span-1">
						<DataTable
							data={activityData}
							columns={[]} // Will be defined in the DataTable component
							title="Recent Activity"
							description="Latest property management activities"
						/>
					</div>
				</div>
			</div>
		</>
	)
}
