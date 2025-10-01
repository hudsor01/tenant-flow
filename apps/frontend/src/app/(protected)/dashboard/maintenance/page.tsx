import { MetricsCard } from '@/components/charts/metrics-card'
import { MaintenanceActionButtons } from '@/components/maintenance/action-buttons'
import { CreateMaintenanceDialog } from '@/components/maintenance/create-maintenance-dialog'
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getMaintenancePageData } from '@/lib/api/dashboard-server'
import { statusClasses } from '@/lib/design-system'
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	Filter,
	Search,
	User,
	Wrench
} from 'lucide-react'

export default async function MaintenancePage() {
	const { data: maintenanceData, stats } = await getMaintenancePageData()

	// All calculations now done in backend
	const openRequests = stats.open
	const inProgress = stats.inProgress
	const totalCost = stats.totalCost
	const avgResponseTime =
		stats.avgResponseTimeHours > 0
			? `${stats.avgResponseTimeHours.toFixed(1)} hours`
			: 'N/A'

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Page Header - moved to content section */}
			<div className="flex items-center justify-between px-4 lg:px-6">
				<div>
					<h1 className="text-3xl font-bold text-gradient-authority">
						Maintenance Management
					</h1>
					<p className="text-muted-foreground mt-1">
						Track, manage, and resolve property maintenance requests
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<Filter className="size-4 mr-2" />
						Filter
					</Button>
					<CreateMaintenanceDialog />
				</div>
			</div>

			{/* Status Overview Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<MetricsCard
					title="Pending Requests"
					value={`${openRequests}`}
					description="Awaiting assignment"
					icon={AlertCircle}
					colorVariant="warning"
				/>

				<MetricsCard
					title="In Progress"
					value={`${inProgress}`}
					description="Currently being worked on"
					icon={Wrench}
					colorVariant="info"
				/>

				<MetricsCard
					title="Total Cost"
					value={`$${totalCost.toLocaleString()}`}
					description="This month"
					icon={DollarSign}
					colorVariant="revenue"
				/>

				<MetricsCard
					title="Avg Response"
					value={avgResponseTime}
					description="Response time"
					icon={Clock}
					colorVariant="warning"
				/>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
						<Input placeholder="Search requests..." className="pl-10 w-72" />
					</div>
					<Select defaultValue="all">
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Priority" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Priorities</SelectItem>
							<SelectItem value="EMERGENCY">Emergency</SelectItem>
							<SelectItem value="HIGH">High</SelectItem>
							<SelectItem value="MEDIUM">Medium</SelectItem>
							<SelectItem value="LOW">Low</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<Select defaultValue="all">
						<SelectTrigger className="w-36">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="OPEN">Open</SelectItem>
							<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
							<SelectItem value="COMPLETED">Completed</SelectItem>
							<SelectItem value="CANCELED">Canceled</SelectItem>
							<SelectItem value="ON_HOLD">On Hold</SelectItem>
						</SelectContent>
					</Select>
					<Select defaultValue="all">
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Categories</SelectItem>
							<SelectItem value="HVAC">HVAC</SelectItem>
							<SelectItem value="PLUMBING">Plumbing</SelectItem>
							<SelectItem value="ELECTRICAL">Electrical</SelectItem>
							<SelectItem value="APPLIANCE">Appliance</SelectItem>
							<SelectItem value="STRUCTURAL">Structural</SelectItem>
							<SelectItem value="GENERAL">General</SelectItem>
							<SelectItem value="OTHER">Other</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Maintenance Requests List */}
			<div className="px-4 lg:px-6">
				<Card className="border shadow-sm">
					<div className="p-6 border-b">
						<h2 className="text-xl font-semibold">
							Active Maintenance Requests
						</h2>
						<p className="text-muted-foreground text-sm mt-1">
							Track and manage all property maintenance requests
						</p>
					</div>
					<div className="p-6">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead className="font-semibold">ID</TableHead>
									<TableHead className="font-semibold">Property</TableHead>
									<TableHead className="font-semibold">Unit</TableHead>
									<TableHead className="font-semibold">Category</TableHead>
									<TableHead className="font-semibold">Priority</TableHead>
									<TableHead className="font-semibold">Status</TableHead>
									<TableHead className="font-semibold">Created</TableHead>
									<TableHead className="font-semibold">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{maintenanceData.length > 0 ? (
									maintenanceData.map(request => (
										<TableRow key={request.id} className="hover:bg-muted/30">
											<TableCell className="font-medium">
												{request.id}
											</TableCell>
											<TableCell>
												{request.property?.name || 'No Property'}
											</TableCell>
											<TableCell>
												{request.unitId ? `Unit ${request.unitId}` : 'No Unit'}
											</TableCell>
											<TableCell>{request.category || 'No Category'}</TableCell>
											<TableCell>{request.priority || 'No Priority'}</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={statusClasses(request.status || 'UNKNOWN')}
												>
													{request.status || 'Unknown'}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{request.createdAt
													? new Date(request.createdAt).toLocaleDateString()
													: 'No date'}
											</TableCell>
											<TableCell>
												<MaintenanceActionButtons maintenance={request} />
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={8} className="h-24 text-center">
											<div className="flex flex-col items-center gap-2">
												<Wrench className="size-12 text-muted-foreground/50" />
												<p className="text-muted-foreground">
													No maintenance requests found.
												</p>
												<CreateMaintenanceDialog />
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</Card>
			</div>

			{/* Quick Actions */}
			<div className="px-4 lg:px-6">
				<Card className="p-6 border shadow-sm">
					<h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<CreateMaintenanceDialog />
						<Button
							variant="outline"
							className="h-auto p-4 flex flex-col items-center gap-2"
						>
							<Calendar className="size-6" />
							<span>Schedule Inspection</span>
						</Button>
						<Button
							variant="outline"
							className="h-auto p-4 flex flex-col items-center gap-2"
						>
							<User className="size-6" />
							<span>Assign Technician</span>
						</Button>
						<Button
							variant="outline"
							className="h-auto p-4 flex flex-col items-center gap-2"
						>
							<CheckCircle className="size-6" />
							<span>Bulk Update</span>
						</Button>
					</div>
				</Card>
			</div>
		</div>
	)
}
