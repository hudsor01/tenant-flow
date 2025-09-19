'use client'

import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	Droplets,
	Filter,
	Hammer,
	Home,
	MapPin,
	Phone,
	Plus,
	Search,
	Thermometer,
	User,
	Wrench,
	Zap
} from 'lucide-react'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { Card } from 'src/components/ui/card'
import { Input } from 'src/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from 'src/components/ui/select'

const maintenanceData = [
	{
		id: 'MNT-2024-001',
		title: 'HVAC System Repair',
		property: 'Sunset Apartments',
		unit: 'Unit 204',
		priority: 'High',
		status: 'In Progress',
		category: 'HVAC',
		assignedTo: 'Mike Johnson',
		requestDate: '2024-01-15',
		dueDate: '2024-01-17',
		cost: 450,
		description: 'Air conditioning unit not cooling properly',
		icon: Thermometer
	},
	{
		id: 'MNT-2024-002',
		title: 'Plumbing Leak Fix',
		property: 'Downtown Lofts',
		unit: 'Unit 512',
		priority: 'Critical',
		status: 'Open',
		category: 'Plumbing',
		assignedTo: 'Sarah Wilson',
		requestDate: '2024-01-16',
		dueDate: '2024-01-16',
		cost: 275,
		description: 'Kitchen sink leaking underneath',
		icon: Droplets
	},
	{
		id: 'MNT-2024-003',
		title: 'Electrical Outlet Repair',
		property: 'Garden View Complex',
		unit: 'Unit 308',
		priority: 'Medium',
		status: 'Completed',
		category: 'Electrical',
		assignedTo: 'Tom Rodriguez',
		requestDate: '2024-01-14',
		dueDate: '2024-01-15',
		cost: 125,
		description: 'Bedroom outlet not working',
		icon: Zap
	},
	{
		id: 'MNT-2024-004',
		title: 'Door Lock Replacement',
		property: 'Riverside Towers',
		unit: 'Unit 1205',
		priority: 'Low',
		status: 'Scheduled',
		category: 'General',
		assignedTo: 'Mike Johnson',
		requestDate: '2024-01-13',
		dueDate: '2024-01-18',
		cost: 89,
		description: 'Front door lock sticking',
		icon: Home
	}
]

const statusColors = {
	Open: {
		bg: 'color-mix(in oklab, var(--chart-3) 15%, transparent)',
		text: 'var(--chart-3)'
	},
	'In Progress': {
		bg: 'color-mix(in oklab, var(--chart-4) 15%, transparent)',
		text: 'var(--chart-4)'
	},
	Scheduled: {
		bg: 'color-mix(in oklab, var(--chart-5) 15%, transparent)',
		text: 'var(--chart-5)'
	},
	Completed: {
		bg: 'color-mix(in oklab, var(--chart-1) 15%, transparent)',
		text: 'var(--chart-1)'
	}
}

const priorityColors = {
	Critical: {
		bg: 'color-mix(in oklab, hsl(var(--destructive)) 15%, transparent)',
		text: 'hsl(var(--destructive))'
	},
	High: {
		bg: 'color-mix(in oklab, hsl(var(--accent)) 15%, transparent)',
		text: 'hsl(var(--accent))'
	},
	Medium: {
		bg: 'color-mix(in oklab, var(--chart-5) 15%, transparent)',
		text: 'var(--chart-5)'
	},
	Low: {
		bg: 'color-mix(in oklab, var(--chart-1) 15%, transparent)',
		text: 'var(--chart-1)'
	}
}

export default function MaintenancePage() {
	const openRequests = maintenanceData.filter(
		item => item.status === 'Open'
	).length
	const inProgress = maintenanceData.filter(
		item => item.status === 'In Progress'
	).length
	const totalCost = maintenanceData.reduce((sum, item) => sum + item.cost, 0)
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
					<Button size="sm">
						<Plus className="size-4 mr-2" />
						New Request
					</Button>
				</div>
			</div>

			{/* Status Overview Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				{/* Open Requests */}
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
						<h3 className="font-semibold">Open Requests</h3>
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
					<div className="text-3xl font-bold mb-1">${totalCost}</div>
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
							<SelectItem value="critical">Critical</SelectItem>
							<SelectItem value="high">High</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="low">Low</SelectItem>
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
							<SelectItem value="open">Open</SelectItem>
							<SelectItem value="progress">In Progress</SelectItem>
							<SelectItem value="scheduled">Scheduled</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
						</SelectContent>
					</Select>
					<Select defaultValue="all">
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Categories</SelectItem>
							<SelectItem value="hvac">HVAC</SelectItem>
							<SelectItem value="plumbing">Plumbing</SelectItem>
							<SelectItem value="electrical">Electrical</SelectItem>
							<SelectItem value="general">General</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Maintenance Requests List */}
			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Active Maintenance Requests</h2>
				{maintenanceData.map((request, index) => (
					<Card key={index} className="border shadow-sm">
						<div className="p-6">
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-start gap-4">
									<div
										className="w-12 h-12 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor:
												'color-mix(in oklab, var(--chart-2) 15%, transparent)'
										}}
									>
										<request.icon
											className="size-6"
											style={{ color: 'var(--chart-2)' }}
										/>
									</div>
									<div>
										<div className="flex items-center gap-2 mb-1">
											<h3 className="text-lg font-semibold">{request.title}</h3>
											<Badge
												className="text-xs"
												style={{
													backgroundColor:
														priorityColors[
															request.priority as keyof typeof priorityColors
														]?.bg,
													color:
														priorityColors[
															request.priority as keyof typeof priorityColors
														]?.text
												}}
											>
												{request.priority}
											</Badge>
										</div>
										<p className="text-muted-foreground text-sm mb-2">
											{request.description}
										</p>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span className="flex items-center gap-1">
												<MapPin className="size-3" />
												{request.property} - {request.unit}
											</span>
											<span className="flex items-center gap-1">
												<User className="size-3" />
												{request.assignedTo}
											</span>
											<span className="flex items-center gap-1">
												<Calendar className="size-3" />
												Due: {request.dueDate}
											</span>
											<span className="flex items-center gap-1">
												<DollarSign className="size-3" />${request.cost}
											</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge
										className="text-xs"
										style={{
											backgroundColor:
												statusColors[
													request.status as keyof typeof statusColors
												]?.bg,
											color:
												statusColors[
													request.status as keyof typeof statusColors
												]?.text
										}}
									>
										{request.status}
									</Badge>
									<span className="text-sm text-muted-foreground">
										#{request.id}
									</span>
								</div>
							</div>
							<div className="flex items-center justify-between pt-4 border-t">
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm">
										<Phone className="size-4 mr-2" />
										Contact
									</Button>
									<Button variant="outline" size="sm">
										<Hammer className="size-4 mr-2" />
										Update
									</Button>
								</div>
								<div className="flex items-center gap-2">
									<Button size="sm">View Details</Button>
								</div>
							</div>
						</div>
					</Card>
				))}
			</div>

			{/* Quick Actions */}
			<Card className="p-6 border shadow-sm">
				<h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<Button
						variant="outline"
						className="h-auto p-4 flex flex-col items-center gap-2"
					>
						<Plus className="size-6" />
						<span>Create Request</span>
					</Button>
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
