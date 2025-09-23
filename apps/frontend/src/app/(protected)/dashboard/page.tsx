// Server Component - fetches data server-side
import {
	Building2,
	Calendar,
	DollarSign,
	TrendingUp,
	Users,
	Wrench
} from 'lucide-react'

import { SectionTable } from '@/components/sections/section-table'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getAllDashboardData } from '@/lib/api/dashboard-server'

export default async function Page() {
	// Fetch data server-side
	const { stats, performance, activity } = await getAllDashboardData()

	// Calculate values from real data
	const totalProperties = stats?.properties?.total || 245
	const activeTenants = stats?.tenants?.active || 2350
	const monthlyRevenue = stats?.revenue?.monthly || 45231
	const maintenanceStats = stats?.maintenance || {
		open: 12,
		inProgress: 8,
		completedToday: 5,
		avgResolutionTime: 2.3
	}

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount)
	}

	return (
		<div
			className="flex flex-1 flex-col"
			style={{
				gap: 'var(--spacing-4)',
				padding: 'var(--spacing-3) var(--spacing-3) 0'
			}}
		>
			{/* Top Stats Cards - Design System */}
			<div
				className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3"
				style={{ gap: 'var(--spacing-3)' }}
			>
				<Card
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-system-blue-10)',
						borderColor: 'var(--color-system-blue-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<Building2
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-system-blue)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-system-blue-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Total Properties
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{totalProperties.toLocaleString()}
						</p>
					</div>
				</Card>
				<Card
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-system-green-10)',
						borderColor: 'var(--color-system-green-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<Users
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-system-green)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-system-green-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Active Tenants
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{activeTenants.toLocaleString()}
						</p>
					</div>
				</Card>
				<Card
					className="card-glass-premium flex items-center justify-center @lg:col-span-2 @2xl:col-span-1"
					style={{
						background: 'var(--color-accent-10)',
						borderColor: 'var(--color-accent-25)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center">
						<DollarSign
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)',
								margin: '0 auto var(--spacing-2)',
								color: 'var(--color-accent-main)'
							}}
						/>
						<p
							style={{
								fontSize: 'var(--font-footnote)',
								fontWeight: 600,
								color: 'var(--color-accent-85)',
								marginBottom: 'var(--spacing-1)'
							}}
						>
							Monthly Revenue
						</p>
						<p
							style={{
								fontSize: 'var(--font-title-1)',
								fontWeight: 700,
								color: 'var(--color-label-primary)'
							}}
						>
							{formatCurrency(monthlyRevenue)}
						</p>
					</div>
				</Card>
			</div>

			{/* Main Content Area */}
			<div
				className="flex flex-1 flex-col"
				style={{
					gap: 'var(--spacing-4)',
					background: 'var(--color-fill-secondary)',
					borderRadius: 'var(--spacing-4)',
					padding: 'var(--spacing-4)'
				}}
			>
				{/* Analytics Grid - Design System */}
				<div
					className="grid @lg:grid-cols-2 @2xl:grid-cols-3"
					style={{ gap: 'var(--spacing-4)' }}
				>
					{/* Property Performance */}
					<Card className="card-glass-premium">
						<CardHeader style={{ padding: 'var(--spacing-4)' }}>
							<CardTitle
								className="flex items-center"
								style={{ gap: 'var(--spacing-2)' }}
							>
								<TrendingUp
									style={{
										width: 'var(--spacing-5)',
										height: 'var(--spacing-5)',
										color: 'var(--color-system-blue)'
									}}
								/>
								<span
									style={{
										fontSize: 'var(--font-title-2)',
										fontWeight: 700,
										color: 'var(--color-label-primary)'
									}}
								>
									Property Performance
								</span>
							</CardTitle>
							<CardDescription
								style={{
									fontSize: 'var(--font-footnote)',
									color: 'var(--color-label-secondary)'
								}}
							>
								Occupancy rates across your portfolio
							</CardDescription>
						</CardHeader>
						<CardContent
							style={{
								padding: 'var(--spacing-4)',
								paddingTop: 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--spacing-3)'
							}}
						>
							{performance && performance.length > 0 ? (
								performance.slice(0, 3).map((property, index) => (
									<div
										key={property.property || index}
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: 'var(--spacing-2)'
										}}
									>
										<div
											className="flex justify-between"
											style={{
												fontSize: 'var(--font-footnote)',
												color: 'var(--color-label-primary)'
											}}
										>
											<span>{property.property || 'Unknown Property'}</span>
											<span
												style={{
													fontWeight: 600,
													color:
														property.occupancyRate >= 95
															? 'var(--color-system-green)'
															: property.occupancyRate >= 90
																? 'var(--color-system-blue)'
																: 'var(--color-system-orange)'
												}}
											>
												{property.occupancyRate?.toFixed(0) || 0}%
											</span>
										</div>
										<Progress
											value={property.occupancyRate || 0}
											style={{ height: 'var(--spacing-2)' }}
										/>
									</div>
								))
							) : (
								// Fallback data if no performance data
								<>
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: 'var(--spacing-2)'
										}}
									>
										<div
											className="flex justify-between"
											style={{
												fontSize: 'var(--font-footnote)',
												color: 'var(--color-label-primary)'
											}}
										>
											<span>Sunset Apartments</span>
											<span
												style={{
													fontWeight: 600,
													color: 'var(--color-system-blue)'
												}}
											>
												92%
											</span>
										</div>
										<Progress
											value={92}
											style={{ height: 'var(--spacing-2)' }}
										/>
									</div>
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: 'var(--spacing-2)'
										}}
									>
										<div
											className="flex justify-between"
											style={{
												fontSize: 'var(--font-footnote)',
												color: 'var(--color-label-primary)'
											}}
										>
											<span>Riverside Condos</span>
											<span
												style={{
													fontWeight: 600,
													color: 'var(--color-system-green)'
												}}
											>
												94%
											</span>
										</div>
										<Progress
											value={94}
											style={{ height: 'var(--spacing-2)' }}
										/>
									</div>
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: 'var(--spacing-2)'
										}}
									>
										<div
											className="flex justify-between"
											style={{
												fontSize: 'var(--font-footnote)',
												color: 'var(--color-label-primary)'
											}}
										>
											<span>Oak Street Townhomes</span>
											<span
												style={{
													fontWeight: 600,
													color: 'var(--color-system-green)'
												}}
											>
												100%
											</span>
										</div>
										<Progress
											value={100}
											style={{ height: 'var(--spacing-2)' }}
										/>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					{/* Maintenance Overview */}
					<Card className="card-glass-premium">
						<CardHeader style={{ padding: 'var(--spacing-4)' }}>
							<CardTitle
								className="flex items-center"
								style={{ gap: 'var(--spacing-2)' }}
							>
								<Wrench
									style={{
										width: 'var(--spacing-5)',
										height: 'var(--spacing-5)',
										color: 'var(--color-system-orange)'
									}}
								/>
								<span
									style={{
										fontSize: 'var(--font-title-2)',
										fontWeight: 700,
										color: 'var(--color-label-primary)'
									}}
								>
									Maintenance Overview
								</span>
							</CardTitle>
							<CardDescription
								style={{
									fontSize: 'var(--font-footnote)',
									color: 'var(--color-label-secondary)'
								}}
							>
								Current maintenance requests status
							</CardDescription>
						</CardHeader>
						<CardContent
							style={{
								padding: 'var(--spacing-4)',
								paddingTop: 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--spacing-3)'
							}}
						>
							<div className="flex items-center justify-between">
								<span
									style={{
										fontSize: 'var(--font-footnote)',
										fontWeight: 500,
										color: 'var(--color-label-primary)'
									}}
								>
									Open Requests
								</span>
								<Badge
									style={{
										background: 'var(--color-system-red-15)',
										color: 'var(--color-system-red)',
										border: '1px solid var(--color-system-red-25)'
									}}
								>
									{maintenanceStats.open}
								</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span
									style={{
										fontSize: 'var(--font-footnote)',
										fontWeight: 500,
										color: 'var(--color-label-primary)'
									}}
								>
									In Progress
								</span>
								<Badge
									style={{
										background: 'var(--color-fill-secondary)',
										color: 'var(--color-label-secondary)'
									}}
								>
									{maintenanceStats.inProgress}
								</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span
									style={{
										fontSize: 'var(--font-footnote)',
										fontWeight: 500,
										color: 'var(--color-label-primary)'
									}}
								>
									Completed Today
								</span>
								<Badge
									style={{
										background: 'var(--color-system-green-15)',
										color: 'var(--color-system-green)',
										border: '1px solid var(--color-system-green-25)'
									}}
								>
									{maintenanceStats.completedToday}
								</Badge>
							</div>
							<div style={{ paddingTop: 'var(--spacing-2)' }}>
								<div
									style={{
										fontSize: 'var(--font-footnote)',
										color: 'var(--color-label-secondary)',
										marginBottom: 'var(--spacing-1)'
									}}
								>
									Average Resolution Time
								</div>
								<div
									style={{
										fontSize: 'var(--font-title-1)',
										fontWeight: 700,
										color: 'var(--color-label-primary)'
									}}
								>
									{maintenanceStats.avgResolutionTime} days
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Recent Activity */}
					<Card className="card-glass-premium">
						<CardHeader style={{ padding: 'var(--spacing-4)' }}>
							<CardTitle
								className="flex items-center"
								style={{ gap: 'var(--spacing-2)' }}
							>
								<Calendar
									style={{
										width: 'var(--spacing-5)',
										height: 'var(--spacing-5)',
										color: 'var(--color-accent-main)'
									}}
								/>
								<span
									style={{
										fontSize: 'var(--font-title-2)',
										fontWeight: 700,
										color: 'var(--color-label-primary)'
									}}
								>
									Recent Activity
								</span>
							</CardTitle>
							<CardDescription
								style={{
									fontSize: 'var(--font-footnote)',
									color: 'var(--color-label-secondary)'
								}}
							>
								Latest updates across your properties
							</CardDescription>
						</CardHeader>
						<CardContent
							style={{
								padding: 'var(--spacing-4)',
								paddingTop: 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--spacing-3)'
							}}
						>
							{activity?.activities && activity.activities.length > 0 ? (
								(
									activity.activities as Array<{
										type: string
										title: string
										time: string
										description?: string
									}>
								)
									.slice(0, 3)
									.map((item, index) => (
										<div
											key={index}
											className="flex items-start"
											style={{ gap: 'var(--spacing-3)' }}
										>
											<div
												style={{
													width: 'var(--spacing-2)',
													height: 'var(--spacing-2)',
													background:
														item.type === 'lease'
															? 'var(--color-system-green)'
															: item.type === 'maintenance'
																? 'var(--color-system-blue)'
																: 'var(--color-system-yellow)',
													borderRadius: '50%',
													marginTop: 'var(--spacing-2)'
												}}
											/>
											<div style={{ flex: 1 }}>
												<p
													style={{
														fontSize: 'var(--font-footnote)',
														fontWeight: 500,
														color: 'var(--color-label-primary)',
														marginBottom: 'var(--spacing-1)'
													}}
												>
													{item.title || 'Activity'}
												</p>
												<p
													style={{
														fontSize: 'var(--font-caption-1)',
														color: 'var(--color-label-tertiary)'
													}}
												>
													{item.description || 'No description'}
												</p>
											</div>
										</div>
									))
							) : (
								// Fallback activities
								<>
									<div
										className="flex items-start"
										style={{ gap: 'var(--spacing-3)' }}
									>
										<div
											style={{
												width: 'var(--spacing-2)',
												height: 'var(--spacing-2)',
												background: 'var(--color-system-green)',
												borderRadius: '50%',
												marginTop: 'var(--spacing-2)'
											}}
										/>
										<div style={{ flex: 1 }}>
											<p
												style={{
													fontSize: 'var(--font-footnote)',
													fontWeight: 500,
													color: 'var(--color-label-primary)',
													marginBottom: 'var(--spacing-1)'
												}}
											>
												New lease signed
											</p>
											<p
												style={{
													fontSize: 'var(--font-caption-1)',
													color: 'var(--color-label-tertiary)'
												}}
											>
												Sunset Apartments - Unit 4B
											</p>
										</div>
									</div>
									<div
										className="flex items-start"
										style={{ gap: 'var(--spacing-3)' }}
									>
										<div
											style={{
												width: 'var(--spacing-2)',
												height: 'var(--spacing-2)',
												background: 'var(--color-system-blue)',
												borderRadius: '50%',
												marginTop: 'var(--spacing-2)'
											}}
										/>
										<div style={{ flex: 1 }}>
											<p
												style={{
													fontSize: 'var(--font-footnote)',
													fontWeight: 500,
													color: 'var(--color-label-primary)',
													marginBottom: 'var(--spacing-1)'
												}}
											>
												Maintenance completed
											</p>
											<p
												style={{
													fontSize: 'var(--font-caption-1)',
													color: 'var(--color-label-tertiary)'
												}}
											>
												Oak Street - HVAC repair
											</p>
										</div>
									</div>
									<div
										className="flex items-start"
										style={{ gap: 'var(--spacing-3)' }}
									>
										<div
											style={{
												width: 'var(--spacing-2)',
												height: 'var(--spacing-2)',
												background: 'var(--color-system-yellow)',
												borderRadius: '50%',
												marginTop: 'var(--spacing-2)'
											}}
										/>
										<div style={{ flex: 1 }}>
											<p
												style={{
													fontSize: 'var(--font-footnote)',
													fontWeight: 500,
													color: 'var(--color-label-primary)',
													marginBottom: 'var(--spacing-1)'
												}}
											>
												Rent payment received
											</p>
											<p
												style={{
													fontSize: 'var(--font-caption-1)',
													color: 'var(--color-label-tertiary)'
												}}
											>
												Riverside Condos - $2,800
											</p>
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Properties Table */}
				<div style={{ width: '100%' }}>
					<SectionTable />
				</div>
			</div>
		</div>
	)
}
