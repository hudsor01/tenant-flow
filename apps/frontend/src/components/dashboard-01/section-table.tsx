'use client'

import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Building2, MapPin, Users } from 'lucide-react'

const recentProperties = [
	{
		id: '1',
		name: 'Sunset Apartments',
		type: 'Apartment Complex',
		location: 'Downtown, CA',
		units: 24,
		occupied: 22,
		revenue: '$45,600',
		status: 'Active'
	},
	{
		id: '2',
		name: 'Riverside Condos',
		type: 'Condominium',
		location: 'Riverside, CA',
		units: 16,
		occupied: 15,
		revenue: '$32,800',
		status: 'Active'
	},
	{
		id: '3',
		name: 'Oak Street Townhomes',
		type: 'Townhouse',
		location: 'Oak Valley, CA',
		units: 12,
		occupied: 12,
		revenue: '$28,800',
		status: 'Active'
	},
	{
		id: '4',
		name: 'Pine View Singles',
		type: 'Single Family',
		location: 'Pine Hills, CA',
		units: 8,
		occupied: 7,
		revenue: '$19,200',
		status: 'Active'
	},
	{
		id: '5',
		name: 'Metro Plaza',
		type: 'Commercial',
		location: 'Metro Center, CA',
		units: 6,
		occupied: 5,
		revenue: '$15,000',
		status: 'Maintenance'
	}
]

export function SectionTable() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Building2 className="h-5 w-5" />
					Recent Properties
				</CardTitle>
				<CardDescription>
					Overview of your most recently added properties
				</CardDescription>
			</CardHeader>
			<CardContent className="p-3 sm:p-6">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-[140px]">Property</TableHead>
								<TableHead className="hidden sm:table-cell">Type</TableHead>
								<TableHead className="hidden md:table-cell">Location</TableHead>
								<TableHead className="text-center min-w-[80px]">
									Occupancy
								</TableHead>
								<TableHead className="text-right min-w-[80px]">
									Revenue
								</TableHead>
								<TableHead className="text-center min-w-[80px]">
									Status
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{recentProperties.map(property => (
								<TableRow key={property.id}>
									<TableCell className="font-medium">
										<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
											<div className="flex items-center gap-2">
												<Building2 className="h-4 w-4 text-muted-foreground" />
												<span className="font-medium">{property.name}</span>
											</div>
											<div className="flex items-center gap-3 text-xs text-muted-foreground sm:hidden">
												<span>{property.type}</span>
												<span className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{property.location}
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{property.type}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<div className="flex items-center gap-1">
											<MapPin className="h-3 w-3 text-muted-foreground" />
											{property.location}
										</div>
									</TableCell>
									<TableCell className="text-center">
										<div className="flex items-center justify-center gap-1">
											<Users className="h-3 w-3 text-muted-foreground" />
											<span className="font-medium">{property.occupied}</span>
											<span className="text-muted-foreground">
												/{property.units}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium">
										{property.revenue}
									</TableCell>
									<TableCell className="text-center">
										<Badge
											variant={
												property.status === 'Active' ? 'default' : 'secondary'
											}
											className={cn(
												'rounded-full border border-transparent px-3 py-1 font-medium',
												property.status === 'Active'
													? 'bg-[var(--color-system-green-10)] text-[var(--color-system-green)] hover:bg-[var(--color-system-green-15)]'
													: 'bg-[var(--color-system-yellow-10)] text-[var(--color-system-yellow)] hover:bg-[var(--color-system-yellow-15)]'
											)}
										>
											{property.status}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
