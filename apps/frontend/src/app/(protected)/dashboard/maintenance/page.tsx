import { CreateMaintenanceDialog } from '@/components/maintenance/create-maintenance-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from '@/components/ui/select'
import
  {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '@/components/ui/table'
import
  {
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
import { getMaintenancePageData } from '@/lib/api/dashboard-server'

export default async function MaintenancePage() {
	const maintenanceResponse = await getMaintenancePageData()
	const maintenanceData = maintenanceResponse?.data || []

	const openRequests = maintenanceData.filter(
		(item: { status: string }) => item.status === 'OPEN'
	).length
	const inProgress = maintenanceData.filter(
		(item: { status: string }) => item.status === 'IN_PROGRESS'
	).length
	const totalCost = maintenanceData.reduce(
		(sum: number, item) => sum + (item.estimatedCost || 0),
		0
	)
	const avgResponseTime = '2.4 hours'

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
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
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				{/* Pending Requests */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-3)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-3) 15%, transparent)'
							}}
						>
							<AlertCircle className="size-5" />
						</div>
						<h3 className="font-semibold">Pending Requests</h3>
					</div>
					<div className="text-3xl font-bold mb-1">{openRequests}</div>
					<p className="text-muted-foreground text-sm">Awaiting assignment</p>
				</Card>

				{/* In Progress */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-4)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-4) 15%, transparent)'
							}}
						>
							<Wrench className="size-5" />
						</div>
						<h3 className="font-semibold">In Progress</h3>
					</div>
					<div className="text-3xl font-bold mb-1">{inProgress}</div>
					<p className="text-muted-foreground text-sm">
						Currently being worked on
					</p>
				</Card>

				{/* Total Cost */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-5)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-5) 15%, transparent)'
							}}
						>
							<DollarSign className="size-5" />
						</div>
						<h3 className="font-semibold">Total Cost</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						${totalCost.toLocaleString()}
					</div>
					<p className="text-muted-foreground text-sm">This month</p>
				</Card>

				{/* Avg Response Time */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-1)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-1) 15%, transparent)'
							}}
						>
							<Clock className="size-5" />
						</div>
						<h3 className="font-semibold">Avg Response</h3>
					</div>
					<div className="text-3xl font-bold mb-1">{avgResponseTime}</div>
					<p className="text-muted-foreground text-sm">Response time</p>
				</Card>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
			<Card className="border shadow-sm">
				<div className="p-6 border-b">
					<h2 className="text-xl font-semibold">Active Maintenance Requests</h2>
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
										<TableCell className="font-medium">{request.id}</TableCell>
										<TableCell>
											{typeof request.property === 'string'
												? request.property
												: request.property?.name || 'No Property'}
										</TableCell>
										<TableCell>
											{request.unitId ? `Unit ${request.unitId}` : 'No Unit'}
										</TableCell>
										<TableCell>{request.category || 'No Category'}</TableCell>
										<TableCell>{request.priority || 'No Priority'}</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs ${
													request.status === 'OPEN'
														? 'bg-[var(--color-system-yellow-10)] text-[var(--color-system-yellow)]'
														: request.status === 'IN_PROGRESS'
															? 'bg-[var(--color-system-blue-10)] text-[var(--color-system-blue)]'
															: request.status === 'COMPLETED'
																? 'bg-[var(--color-system-green-10)] text-[var(--color-system-green)]'
																: 'bg-[var(--color-fill-secondary)] text-[var(--color-label-tertiary)]'
												}`}
											>
												{request.status || 'No Status'}
											</span>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{request.createdAt
												? new Date(request.createdAt).toLocaleDateString()
												: 'No date'}
										</TableCell>
										<TableCell>
											{/* Placeholder for actions; replace with a component like MaintenanceActionButtons if available */}
											<Button size="sm" variant="outline">
												View
											</Button>
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

			{/* Quick Actions */}
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
	)
}
