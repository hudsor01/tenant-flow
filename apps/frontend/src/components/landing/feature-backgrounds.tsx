'use client'

import { cn } from '#lib/utils'
import { Home, FileText } from 'lucide-react'

export function PropertyGrid() {
	return (
		<div className="absolute inset-x-0 top-0 bottom-[45%] p-4">
			<div className="grid grid-cols-2 gap-2 h-full opacity-70">
				{[
					{ name: '123 Oak St', units: 4, occupancy: '100%' },
					{ name: '456 Maple Ave', units: 8, occupancy: '87%' },
					{ name: '789 Pine Rd', units: 12, occupancy: '92%' },
					{ name: '321 Cedar Ln', units: 6, occupancy: '100%' }
				].map((property, i) => (
					<div
						key={property.name}
						className="card-standard p-3 flex flex-col justify-between"
						style={{ animationDelay: `${i * 100}ms` }}
					>
						<div className="flex items-center gap-2">
							<div className="icon-container-sm bg-primary/10 text-primary">
								<Home className="size-3" />
							</div>
							<span className="text-xs font-medium text-foreground truncate">
								{property.name}
							</span>
						</div>
						<div className="flex justify-between text-xs mt-2">
							<span className="text-muted-foreground">{property.units} units</span>
							<span className="text-success font-medium">{property.occupancy}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export function RentCollection() {
	return (
		<div className="absolute inset-x-0 top-0 bottom-[30%] p-4 overflow-hidden">
			<div className="space-y-3 opacity-70">
				<div className="card-standard p-3">
					<div className="flex justify-between text-xs mb-2">
						<span className="text-muted-foreground">December Rent</span>
						<span className="text-foreground font-medium">$48,250 / $52,000</span>
					</div>
					<div className="h-2 bg-muted rounded-full overflow-hidden">
						<div className="h-full bg-success rounded-full w-[93%]" />
					</div>
				</div>
				<div className="space-y-2">
					{[
						{ tenant: 'Sarah Johnson', amount: '$1,850', status: 'Paid' },
						{ tenant: 'Michael Chen', amount: '$2,200', status: 'Paid' },
						{ tenant: 'Emily Davis', amount: '$1,650', status: 'Pending' }
					].map(payment => (
						<div key={payment.tenant} className="card-standard p-2 flex-between">
							<span className="text-xs text-foreground">{payment.tenant}</span>
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-foreground">
									{payment.amount}
								</span>
								<span
									className={cn(
										'text-xs px-2 py-0.5 rounded-full',
										payment.status === 'Paid'
											? 'bg-success/10 text-success'
											: 'bg-warning/10 text-warning'
									)}
								>
									{payment.status}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function TenantListBackground() {
	return (
		<div className="absolute inset-x-0 top-0 bottom-[45%] p-4 overflow-hidden">
			<div className="space-y-2 opacity-70">
				{[
					{
						name: 'Alex Thompson',
						unit: 'Unit 2A',
						lease: 'Active',
						rent: '$1,800'
					},
					{
						name: 'Jessica Miller',
						unit: 'Unit 3B',
						lease: 'Renewing',
						rent: '$2,100'
					},
					{
						name: 'David Wilson',
						unit: 'Unit 1C',
						lease: 'Active',
						rent: '$1,650'
					},
					{
						name: 'Rachel Green',
						unit: 'Unit 4D',
						lease: 'Active',
						rent: '$1,950'
					}
				].map(tenant => (
					<div key={tenant.name} className="card-standard p-3 flex-between">
						<div className="flex items-center gap-3">
							<div className="size-8 rounded-full bg-primary/10 flex-center text-primary text-xs font-medium">
								{tenant.name
									.split(' ')
									.map(n => n[0])
									.join('')}
							</div>
							<div>
								<div className="text-xs font-medium text-foreground">
									{tenant.name}
								</div>
								<div className="text-xs text-muted-foreground">{tenant.unit}</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-xs font-medium text-foreground">
								{tenant.rent}
							</div>
							<span
								className={cn(
									'text-xs',
									tenant.lease === 'Renewing' ? 'text-warning' : 'text-success'
								)}
							>
								{tenant.lease}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export function MaintenanceBoard() {
	return (
		<div className="absolute inset-x-0 top-0 bottom-[45%] p-4 overflow-hidden">
			<div className="grid grid-cols-3 gap-2 h-full opacity-70">
				<div className="space-y-2">
					<div className="text-xs font-medium text-muted-foreground px-1">Open</div>
					<div className="card-standard p-2 border-l-2 border-l-warning">
						<div className="text-xs font-medium text-foreground">Leaky Faucet</div>
						<div className="text-xs text-muted-foreground">Unit 2A</div>
					</div>
				</div>
				<div className="space-y-2">
					<div className="text-xs font-medium text-muted-foreground px-1">
						In Progress
					</div>
					<div className="card-standard p-2 border-l-2 border-l-info">
						<div className="text-xs font-medium text-foreground">HVAC Repair</div>
						<div className="text-xs text-muted-foreground">Unit 3B</div>
					</div>
					<div className="card-standard p-2 border-l-2 border-l-info">
						<div className="text-xs font-medium text-foreground">Window Fix</div>
						<div className="text-xs text-muted-foreground">Unit 1C</div>
					</div>
				</div>
				<div className="space-y-2">
					<div className="text-xs font-medium text-muted-foreground px-1">Done</div>
					<div className="card-standard p-2 border-l-2 border-l-success">
						<div className="text-xs font-medium text-foreground">Paint Touch-up</div>
						<div className="text-xs text-muted-foreground">Unit 4D</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function AnalyticsPreview() {
	return (
		<div className="absolute inset-x-0 top-0 bottom-[40%] p-4 overflow-hidden">
			<div className="space-y-3 opacity-70">
				<div className="card-standard p-3">
					<div className="flex-between mb-2">
						<span className="text-xs text-muted-foreground">Monthly Revenue</span>
						<span className="text-xs font-medium text-success">+12.5%</span>
					</div>
					<div className="flex items-end gap-1 h-16">
						{[45, 52, 48, 61, 55, 70, 65, 78, 72, 85, 80, 92].map((height, i) => (
							<div
								key={i}
								className="bg-primary/70 rounded-sm flex-1 transition-all duration-300"
								style={{ height: `${height}%` }}
							/>
						))}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="card-standard p-2 text-center">
						<div className="text-lg font-bold text-foreground">96.2%</div>
						<div className="text-xs text-muted-foreground">Occupancy</div>
					</div>
					<div className="card-standard p-2 text-center">
						<div className="text-lg font-bold text-foreground">$2,450</div>
						<div className="text-xs text-muted-foreground">Avg. Rent</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function LeaseDocuments() {
	return (
		<div className="absolute inset-x-0 top-0 bottom-[45%] p-4 overflow-hidden">
			<div className="space-y-2 opacity-70">
				{[
					{
						name: 'Lease Agreement - Unit 2A',
						status: 'Signed',
						date: 'Dec 1, 2024'
					},
					{
						name: 'Renewal Notice - Unit 3B',
						status: 'Pending',
						date: 'Dec 15, 2024'
					},
					{ name: 'Move-in Inspection', status: 'Signed', date: 'Nov 28, 2024' },
					{
						name: 'Pet Addendum - Unit 1C',
						status: 'Signed',
						date: 'Nov 20, 2024'
					}
				].map(doc => (
					<div key={doc.name} className="card-standard p-3 flex-between">
						<div className="flex items-center gap-3">
							<div className="icon-container-sm bg-primary/10 text-primary">
								<FileText className="size-3" />
							</div>
							<div>
								<div className="text-xs font-medium text-foreground">{doc.name}</div>
								<div className="text-xs text-muted-foreground">{doc.date}</div>
							</div>
						</div>
						<span
							className={cn(
								'text-xs px-2 py-0.5 rounded-full',
								doc.status === 'Signed'
									? 'bg-success/10 text-success'
									: 'bg-warning/10 text-warning'
							)}
						>
							{doc.status}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
