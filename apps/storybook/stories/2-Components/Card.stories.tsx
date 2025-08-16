import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
	CardAction
} from '@/components/ui/card'
import {
	StatsCard,
	StatsGrid,
	PropertyStatsCards,
	StatsCardWithChart
} from '@/components/ui/stats-card'
import { PricingTierCard } from '@/components/pricing/pricing-tier-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	Users,
	Home,
	Wrench,
	Settings,
	Calendar,
	FileText,
	MoreVertical,
	Star,
	Heart,
	Share2,
	Bookmark,
	Clock,
	MapPin,
	Building
} from 'lucide-react'

const meta = {
	title: 'Components/Card',
	component: Card,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Flexible card system with multiple variants and patterns.'
			}
		}
	}
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

// Basic Card Structure
export const Basic: Story = {
	render: () => (
		<Card className="max-w-md">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>
					This is a basic card description.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					This is the card content area where you can put any content.
				</p>
			</CardContent>
			<CardFooter>
				<Button>Action</Button>
			</CardFooter>
		</Card>
	)
}

// Card Variants
export const AllVariants: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{/* Simple Card */}
			<Card>
				<CardHeader>
					<CardTitle>Simple Card</CardTitle>
					<CardDescription>
						Basic card with title and description
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-600">Simple content area</p>
				</CardContent>
			</Card>

			{/* Card with Action */}
			<Card>
				<CardHeader>
					<CardTitle>With Action</CardTitle>
					<CardAction>
						<Button size="sm" variant="outline">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</CardAction>
					<CardDescription>
						Card with header action button
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-600">
						Content with header action
					</p>
				</CardContent>
			</Card>

			{/* Card with Footer */}
			<Card>
				<CardHeader>
					<CardTitle>With Footer</CardTitle>
					<CardDescription>Card with footer actions</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-600">Content area</p>
				</CardContent>
				<CardFooter className="justify-between">
					<Button variant="outline">Cancel</Button>
					<Button>Save</Button>
				</CardFooter>
			</Card>

			{/* Card with Icon */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-blue-100 p-2">
							<Settings className="h-4 w-4 text-blue-600" />
						</div>
						<div>
							<CardTitle>Settings</CardTitle>
							<CardDescription>
								Manage your preferences
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-600">
						Configuration options
					</p>
				</CardContent>
			</Card>

			{/* Card with Badge */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle>Feature Request</CardTitle>
							<CardDescription>
								New dashboard feature
							</CardDescription>
						</div>
						<Badge variant="secondary">New</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-600">Feature description</p>
				</CardContent>
			</Card>

			{/* Clickable Card */}
			<Card className="cursor-pointer transition-shadow hover:shadow-lg">
				<CardHeader>
					<CardTitle>Clickable Card</CardTitle>
					<CardDescription>Hover to see the effect</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-600">
						Interactive card content
					</p>
				</CardContent>
			</Card>
		</div>
	)
}

// Stats Cards
export const StatsCards: Story = {
	render: () => (
		<div className="space-y-6">
			<div>
				<h3 className="mb-4 text-lg font-semibold">
					Individual Stats Cards
				</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatsCard
						title="Total Revenue"
						value="$24,531"
						description="Monthly earnings"
						trend={{ value: 12.5, label: 'from last month' }}
						icon={<DollarSign className="h-4 w-4" />}
						variant="revenue"
					/>
					<StatsCard
						title="Active Tenants"
						value="142"
						description="Current tenants"
						trend={{ value: 8.2, label: 'from last month' }}
						icon={<Users className="h-4 w-4" />}
						variant="tenants"
					/>
					<StatsCard
						title="Properties"
						value="24"
						description="Total properties"
						trend={{ value: 2, label: 'from last quarter' }}
						icon={<Home className="h-4 w-4" />}
						variant="properties"
					/>
					<StatsCard
						title="Maintenance"
						value="7"
						description="Open requests"
						trend={{ value: -15, label: 'from last week' }}
						icon={<Wrench className="h-4 w-4" />}
						variant="maintenance"
					/>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">Loading State</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatsCard title="Loading Card" value="$0" loading={true} />
					<StatsCard title="Loading Card" value="0" loading={true} />
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">
					Complete Stats Grid
				</h3>
				<PropertyStatsCards />
			</div>
		</div>
	)
}

// Property Management Cards
export const PropertyCards: Story = {
	render: () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Property Management Cards</h3>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{/* Property Card */}
				<Card className="overflow-hidden">
					<div className="relative aspect-video bg-gradient-to-br from-blue-50 to-indigo-100">
						<div className="absolute inset-0 flex items-center justify-center">
							<Building className="h-12 w-12 text-blue-500" />
						</div>
						<Badge className="absolute top-2 right-2">
							Available
						</Badge>
					</div>
					<CardHeader>
						<CardTitle>Sunset Apartments</CardTitle>
						<CardDescription className="flex items-center gap-1">
							<MapPin className="h-3 w-3" />
							123 Main St, Downtown
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-500">Rent:</span>
								<p className="font-semibold">$2,500/mo</p>
							</div>
							<div>
								<span className="text-gray-500">Units:</span>
								<p className="font-semibold">24 total</p>
							</div>
							<div>
								<span className="text-gray-500">Occupied:</span>
								<p className="font-semibold">22 (92%)</p>
							</div>
							<div>
								<span className="text-gray-500">Type:</span>
								<p className="font-semibold">Apartment</p>
							</div>
						</div>
					</CardContent>
					<CardFooter>
						<Button variant="outline" className="w-full">
							View Details
						</Button>
					</CardFooter>
				</Card>

				{/* Tenant Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
								<Users className="h-5 w-5 text-blue-600" />
							</div>
							<div className="flex-1">
								<CardTitle className="text-base">
									John & Jane Smith
								</CardTitle>
								<CardDescription>
									Unit 2B • Lease expires Dec 2024
								</CardDescription>
							</div>
							<Badge variant="outline">Active</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-500">Rent:</span>
								<span className="font-medium">$1,800/mo</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">Deposit:</span>
								<span className="font-medium">$3,600</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">
									Last Payment:
								</span>
								<span className="font-medium text-green-600">
									Dec 1, 2024
								</span>
							</div>
						</div>
					</CardContent>
					<CardFooter className="gap-2">
						<Button variant="outline" size="sm" className="flex-1">
							Message
						</Button>
						<Button variant="outline" size="sm" className="flex-1">
							View Lease
						</Button>
					</CardFooter>
				</Card>

				{/* Maintenance Request Card */}
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
									<Wrench className="h-4 w-4 text-red-600" />
								</div>
								<div>
									<CardTitle className="text-base">
										Leaky Faucet
									</CardTitle>
									<CardDescription>
										Unit 3A • High Priority
									</CardDescription>
								</div>
							</div>
							<Badge variant="destructive">Urgent</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<p className="mb-3 text-sm text-gray-600">
							Kitchen sink faucet is leaking continuously. Water
							damage potential.
						</p>
						<div className="flex items-center gap-2 text-xs text-gray-500">
							<Clock className="h-3 w-3" />
							<span>Submitted 2 hours ago</span>
						</div>
					</CardContent>
					<CardFooter className="gap-2">
						<Button size="sm" className="flex-1">
							Assign Vendor
						</Button>
						<Button variant="outline" size="sm">
							View Details
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	)
}

// Dashboard Cards
export const DashboardCards: Story = {
	render: () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Dashboard Cards</h3>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				{/* Recent Activity Card */}
				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>
							Latest updates from your properties
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{[
								{
									icon: Users,
									text: 'New tenant moved into Unit 2B',
									time: '2 hours ago',
									color: 'text-green-600'
								},
								{
									icon: DollarSign,
									text: 'Rent payment received - Unit 1A',
									time: '4 hours ago',
									color: 'text-blue-600'
								},
								{
									icon: Wrench,
									text: 'Maintenance request submitted',
									time: '6 hours ago',
									color: 'text-amber-600'
								},
								{
									icon: FileText,
									text: 'Lease renewal signed - Unit 3C',
									time: '1 day ago',
									color: 'text-purple-600'
								}
							].map((item, index) => (
								<div
									key={index}
									className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
								>
									<div
										className={`rounded-full bg-gray-100 p-1.5 ${item.color}`}
									>
										<item.icon className="h-3 w-3" />
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											{item.text}
										</p>
										<p className="text-xs text-gray-500">
											{item.time}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
					<CardFooter>
						<Button variant="ghost" className="w-full">
							View All Activity
						</Button>
					</CardFooter>
				</Card>

				{/* Quick Actions Card */}
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>
							Common tasks and shortcuts
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3">
							{[
								{
									icon: Users,
									label: 'Add Tenant',
									color: 'bg-blue-50 text-blue-600'
								},
								{
									icon: Home,
									label: 'New Property',
									color: 'bg-green-50 text-green-600'
								},
								{
									icon: FileText,
									label: 'Create Lease',
									color: 'bg-purple-50 text-purple-600'
								},
								{
									icon: DollarSign,
									label: 'Record Payment',
									color: 'bg-emerald-50 text-emerald-600'
								},
								{
									icon: Wrench,
									label: 'Add Maintenance',
									color: 'bg-amber-50 text-amber-600'
								},
								{
									icon: Calendar,
									label: 'Schedule Tour',
									color: 'bg-indigo-50 text-indigo-600'
								}
							].map((action, index) => (
								<Button
									key={index}
									variant="ghost"
									className={`h-auto flex-col gap-2 p-3 ${action.color.replace('text-', 'hover:bg-').replace('-600', '-100')}`}
								>
									<action.icon className="h-5 w-5" />
									<span className="text-xs font-medium">
										{action.label}
									</span>
								</Button>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

// Pricing Cards (showing consolidation opportunity)
export const PricingCards: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
				<h3 className="mb-3 font-semibold text-amber-800">
					⚠️ Consolidation Opportunity
				</h3>
				<p className="mb-4 text-sm text-amber-700">
					Multiple pricing card components can be unified using the
					base Card with props for variants.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{/* Mock pricing cards showing the pattern */}
				{[
					{
						name: 'Starter',
						price: '$29',
						period: 'month',
						description: 'Perfect for small property managers',
						features: [
							'Up to 5 properties',
							'Basic tenant management',
							'Email support'
						],
						recommended: false
					},
					{
						name: 'Professional',
						price: '$99',
						period: 'month',
						description: 'Ideal for growing businesses',
						features: [
							'Up to 25 properties',
							'Advanced analytics',
							'Priority support',
							'API access'
						],
						recommended: true
					},
					{
						name: 'Enterprise',
						price: 'Custom',
						period: '',
						description: 'For large property management companies',
						features: [
							'Unlimited properties',
							'Custom integrations',
							'Dedicated support',
							'SLA guarantee'
						],
						recommended: false
					}
				].map((plan, index) => (
					<Card
						key={index}
						className={`relative ${plan.recommended ? 'border-brand-500 shadow-lg' : ''}`}
					>
						{plan.recommended && (
							<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
								<Badge className="bg-blue-500">
									Most Popular
								</Badge>
							</div>
						)}
						<CardHeader className="text-center">
							<CardTitle className="text-xl">
								{plan.name}
							</CardTitle>
							<CardDescription>
								{plan.description}
							</CardDescription>
							<div className="pt-4">
								<span className="text-4xl font-bold">
									{plan.price}
								</span>
								{plan.period && (
									<span className="text-gray-500">
										/{plan.period}
									</span>
								)}
							</div>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								{plan.features.map((feature, featureIndex) => (
									<li
										key={featureIndex}
										className="flex items-center gap-2"
									>
										<div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100">
											<div className="h-2 w-2 rounded-full bg-green-500" />
										</div>
										<span className="text-sm">
											{feature}
										</span>
									</li>
								))}
							</ul>
						</CardContent>
						<CardFooter>
							<Button
								className="w-full"
								variant={
									plan.recommended ? 'default' : 'outline'
								}
							>
								{plan.price === 'Custom'
									? 'Contact Sales'
									: 'Get Started'}
							</Button>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	)
}

// Card with Chart (Stats Card Enhancement)
export const CardsWithCharts: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<StatsCardWithChart
				title="Monthly Revenue"
				value="$24,531"
				description="Total revenue this month"
				trend={{ value: 12.5, label: 'from last month' }}
				icon={<TrendingUp className="h-4 w-4" />}
				chart={
					<div className="flex h-[80px] items-end justify-between rounded bg-gradient-to-r from-green-100 to-emerald-100 p-2">
						{[40, 60, 45, 80, 65, 90, 75].map((height, index) => (
							<div
								key={index}
								className="w-2 rounded-t bg-green-500"
								style={{ height: `${height}%` }}
							/>
						))}
					</div>
				}
			/>

			<StatsCardWithChart
				title="Occupancy Rate"
				value="92%"
				description="Current occupancy across all properties"
				trend={{ value: -2.1, label: 'from last month' }}
				icon={<Home className="h-4 w-4" />}
				chart={
					<div className="flex h-[80px] items-center justify-center">
						<div className="relative h-16 w-16">
							<div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
							<div
								className="border-brand-500 absolute inset-0 rounded-full border-4 border-t-transparent"
								style={{ transform: 'rotate(331deg)' }}
							></div>
							<div className="absolute inset-0 flex items-center justify-center">
								<span className="text-xs font-bold">92%</span>
							</div>
						</div>
					</div>
				}
			/>
		</div>
	)
}

// Consolidation Summary
export const ConsolidationPlan: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
				<h2 className="mb-4 text-xl font-bold">
					Card Component Consolidation Plan
				</h2>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="rounded-lg bg-white p-4">
						<h3 className="mb-3 font-semibold text-red-600">
							Current State (12+ Components)
						</h3>
						<ul className="space-y-1 text-sm text-gray-600">
							<li>• StatsCard (complex with variants)</li>
							<li>• PricingTierCard (specialized)</li>
							<li>• PricingCard (multiple versions)</li>
							<li>• PropertyCard (property-specific)</li>
							<li>• DashboardCard (dashboard-specific)</li>
							<li>• StatsCardWithChart (chart integration)</li>
							<li>• Multiple other specialized cards</li>
						</ul>
					</div>

					<div className="rounded-lg bg-white p-4">
						<h3 className="mb-3 font-semibold text-green-600">
							Target State (1 Flexible Component)
						</h3>
						<ul className="space-y-1 text-sm text-green-600">
							<li>✓ Base Card with composable parts</li>
							<li>✓ Variant prop for different styles</li>
							<li>
								✓ Props for common patterns (stats, pricing)
							</li>
							<li>✓ Slot-based content areas</li>
							<li>✓ Built-in loading states</li>
							<li>✓ Consistent hover and animation effects</li>
						</ul>
					</div>
				</div>

				<div className="mt-6 rounded-lg bg-white p-4">
					<h3 className="mb-2 font-semibold">
						Implementation Strategy
					</h3>
					<div className="grid grid-cols-3 gap-4 text-center">
						<div>
							<div className="text-2xl font-bold text-blue-600">
								80%
							</div>
							<div className="text-sm text-gray-600">
								Code Reduction
							</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-green-600">
								1
							</div>
							<div className="text-sm text-gray-600">
								Unified Component
							</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-purple-600">
								5x
							</div>
							<div className="text-sm text-gray-600">
								Faster Development
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
