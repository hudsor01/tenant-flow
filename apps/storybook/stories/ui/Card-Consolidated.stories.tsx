import type { Meta, StoryObj } from '@storybook/react'
import {
	Card,
	StatsGrid,
	CardHeader,
	CardContent,
	CardDescription,
	CardFooter,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	Users,
	Building2,
	Settings,
	Eye,
	Edit3
} from 'lucide-react'

const meta: Meta<typeof Card> = {
	title: 'UI/Card (Consolidated)',
	component: Card,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
# Consolidated Card Component

A single, unified Card component that replaces multiple specialized card components using behavior-based props.

## Migration from Old Components

### Stats Card
\`\`\`tsx
// ❌ Old approach - separate components
import { StatsCard } from './stats-card'
<StatsCard title="Revenue" value="$45,231" variant="revenue" />

// ✅ New approach - behavior props
import { Card } from './card'
<Card 
  behavior="stats" 
  title="Revenue" 
  value="$45,231" 
  variant="revenue" 
/>
\`\`\`

### Pricing Card
\`\`\`tsx
// ❌ Old approach
import { PricingCard } from './pricing-card'
<PricingCard tier={tier} billingInterval="yearly" />

// ✅ New approach
import { Card } from './card'
<Card 
  behavior="pricing" 
  tier={tier} 
  billingInterval="yearly" 
/>
\`\`\`

### Property Card
\`\`\`tsx
// ❌ Old approach
import PropertyCard from './property-card'
<PropertyCard property={property} onEdit={handleEdit} />

// ✅ New approach
import { Card } from './card'
<Card 
  behavior="property" 
  property={property} 
  onEdit={handleEdit} 
/>
\`\`\`

## Available Behaviors
- **default**: Basic card with custom content
- **stats**: Statistics display with trends, icons, and variants
- **pricing**: Subscription pricing with tiers and billing intervals
- **property**: Property management with images, stats, and actions
				`
			}
		}
	},
	argTypes: {
		behavior: {
			control: { type: 'select' },
			options: ['default', 'stats', 'pricing', 'property'],
			description: 'Card behavior type'
		},
		variant: {
			control: { type: 'select' },
			options: [
				'default',
				'revenue',
				'tenants',
				'properties',
				'maintenance',
				'occupancy',
				'popular',
				'current'
			],
			description: 'Visual variant for styling'
		},
		loading: {
			control: { type: 'boolean' },
			description: 'Show loading state'
		}
	}
}

export default meta
type Story = StoryObj<typeof Card>

// Default Card Stories
export const Default: Story = {
	args: {
		behavior: 'default',
		children: (
			<>
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
					<CardDescription>
						This is a description of the card content.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This is the main content of the card.</p>
				</CardContent>
				<CardFooter>
					<Button>Action</Button>
				</CardFooter>
			</>
		)
	}
}

// Stats Card Stories
export const StatsRevenue: Story = {
	args: {
		behavior: 'stats',
		title: 'Total Revenue',
		value: '$45,231',
		description: 'Monthly recurring revenue',
		variant: 'revenue',
		trend: {
			value: 12.5,
			label: 'from last month',
			isPositive: true
		},
		icon: <DollarSign className="h-4 w-4" />
	}
}

export const StatsTenants: Story = {
	args: {
		behavior: 'stats',
		title: 'Active Tenants',
		value: '1,234',
		description: 'Currently signed tenants',
		variant: 'tenants',
		trend: {
			value: 8.2,
			label: 'from last month',
			isPositive: true
		},
		icon: <Users className="h-4 w-4" />
	}
}

export const StatsProperties: Story = {
	args: {
		behavior: 'stats',
		title: 'Properties',
		value: '24',
		description: 'Active properties',
		variant: 'properties',
		trend: {
			value: 3,
			label: 'from last month',
			isPositive: true
		},
		icon: <Building2 className="h-4 w-4" />
	}
}

export const StatsMaintenance: Story = {
	args: {
		behavior: 'stats',
		title: 'Maintenance Requests',
		value: '7',
		description: 'Pending requests',
		variant: 'maintenance',
		trend: {
			value: -15,
			label: 'from last week',
			isPositive: true // Negative trend is good for maintenance
		},
		icon: <Settings className="h-4 w-4" />
	}
}

export const StatsOccupancy: Story = {
	args: {
		behavior: 'stats',
		title: 'Occupancy Rate',
		value: '92%',
		description: 'Currently occupied units',
		variant: 'occupancy',
		trend: {
			value: 3.2,
			label: 'from last month',
			isPositive: true
		},
		icon: <TrendingUp className="h-4 w-4" />
	}
}

export const StatsLoading: Story = {
	args: {
		behavior: 'stats',
		title: 'Loading Stats',
		value: '0',
		loading: true
	}
}

// Stats Grid Demo
export const StatsGridDemo: Story = {
	render: () => (
		<StatsGrid columns={4} className="w-full max-w-6xl">
			<Card
				behavior="stats"
				title="Total Revenue"
				value="$45,231"
				description="Monthly recurring revenue"
				variant="revenue"
				trend={{
					value: 12.5,
					label: 'from last month',
					isPositive: true
				}}
				icon={<DollarSign className="h-4 w-4" />}
			/>
			<Card
				behavior="stats"
				title="Active Tenants"
				value="1,234"
				description="Currently signed tenants"
				variant="tenants"
				trend={{
					value: 8.2,
					label: 'from last month',
					isPositive: true
				}}
				icon={<Users className="h-4 w-4" />}
			/>
			<Card
				behavior="stats"
				title="Properties"
				value="24"
				description="Active properties"
				variant="properties"
				trend={{ value: 3, label: 'from last month', isPositive: true }}
				icon={<Building2 className="h-4 w-4" />}
			/>
			<Card
				behavior="stats"
				title="Occupancy Rate"
				value="92%"
				description="Currently occupied units"
				variant="occupancy"
				trend={{
					value: 3.2,
					label: 'from last month',
					isPositive: true
				}}
				icon={<TrendingUp className="h-4 w-4" />}
			/>
		</StatsGrid>
	)
}

// Pricing Card Stories
const mockTier = {
	id: 'GROWTH',
	name: 'Growth Plan',
	description: 'Perfect for growing property managers',
	price: {
		monthly: 49,
		annual: 490
	},
	limits: {
		properties: 50,
		units: 500
	},
	features: [
		'Up to 50 properties',
		'Up to 500 units',
		'Advanced reporting',
		'Priority support',
		'Custom branding',
		'API access'
	]
}

const mockFreeTier = {
	id: 'FREETRIAL',
	name: 'Free Trial',
	description: 'Try TenantFlow for 14 days',
	price: { monthly: 0, annual: 0 },
	limits: { properties: 3, units: 10 },
	features: [
		'Up to 3 properties',
		'Up to 10 units',
		'Basic reporting',
		'Email support'
	]
}

const mockEnterpriseTier = {
	id: 'TENANTFLOW_MAX',
	name: 'Enterprise',
	description: 'For large property management companies',
	price: { monthly: 0, annual: 0 },
	limits: { properties: 0, units: 0 },
	features: [
		'Unlimited properties',
		'Unlimited units',
		'Advanced analytics',
		'Dedicated support',
		'Custom integrations',
		'SLA guarantee'
	]
}

export const PricingGrowthMonthly: Story = {
	args: {
		behavior: 'pricing',
		tier: mockTier,
		billingInterval: 'monthly',
		isCurrentPlan: false,
		onSubscribe: () => console.log('Subscribe clicked')
	}
}

export const PricingGrowthYearly: Story = {
	args: {
		behavior: 'pricing',
		tier: mockTier,
		billingInterval: 'yearly',
		isCurrentPlan: false,
		onSubscribe: () => console.log('Subscribe clicked')
	}
}

export const PricingFreeTrial: Story = {
	args: {
		behavior: 'pricing',
		tier: mockFreeTier,
		billingInterval: 'monthly',
		onSubscribe: () => console.log('Start trial clicked')
	}
}

export const PricingEnterprise: Story = {
	args: {
		behavior: 'pricing',
		tier: mockEnterpriseTier,
		billingInterval: 'monthly',
		onSubscribe: () => console.log('Contact sales clicked')
	}
}

export const PricingCurrentPlan: Story = {
	args: {
		behavior: 'pricing',
		tier: mockTier,
		billingInterval: 'yearly',
		isCurrentPlan: true,
		onSubscribe: () => console.log('Current plan')
	}
}

export const PricingLoading: Story = {
	args: {
		behavior: 'pricing',
		tier: mockTier,
		billingInterval: 'monthly',
		loading: true,
		onSubscribe: () => console.log('Loading...')
	}
}

// Property Card Stories
const mockProperty = {
	id: '1',
	name: 'Sunset Apartments',
	description:
		'Modern apartment complex with great amenities and convenient location near downtown.',
	address: '123 Main Street',
	city: 'San Francisco',
	state: 'CA',
	zipCode: '94102',
	imageUrl:
		'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
	units: [
		{ id: '1', status: 'OCCUPIED', rent: 2500 },
		{ id: '2', status: 'OCCUPIED', rent: 2300 },
		{ id: '3', status: 'VACANT', rent: 2400 },
		{ id: '4', status: 'OCCUPIED', rent: 2600 },
		{ id: '5', status: 'OCCUPIED', rent: 2350 }
	]
}

const mockPropertyNoImage = {
	...mockProperty,
	imageUrl: undefined,
	name: 'Downtown Lofts'
}

export const PropertyWithImage: Story = {
	args: {
		behavior: 'property',
		property: mockProperty,
		onEdit: property => console.log('Edit:', property.name),
		onView: property => console.log('View:', property.name)
	}
}

export const PropertyNoImage: Story = {
	args: {
		behavior: 'property',
		property: mockPropertyNoImage,
		onEdit: property => console.log('Edit:', property.name),
		onView: property => console.log('View:', property.name)
	}
}

// Migration Examples
export const MigrationExample: Story = {
	render: () => (
		<div className="w-full max-w-4xl space-y-8">
			<div>
				<h3 className="mb-4 text-lg font-semibold">
					✅ New Consolidated Approach
				</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{/* Stats Card */}
					<Card
						behavior="stats"
						title="Revenue"
						value="$45,231"
						variant="revenue"
						trend={{ value: 12.5, isPositive: true }}
						icon={<DollarSign className="h-4 w-4" />}
					/>

					{/* Pricing Card */}
					<Card
						behavior="pricing"
						tier={mockFreeTier}
						billingInterval="monthly"
					/>

					{/* Default Card */}
					<Card behavior="default">
						<CardHeader>
							<CardTitle>Custom Card</CardTitle>
							<CardDescription>
								Use default behavior for custom content
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Any custom content here</p>
						</CardContent>
						<CardFooter>
							<Button size="sm">Action</Button>
						</CardFooter>
					</Card>
				</div>
			</div>

			<div className="rounded-lg border border-green-200 bg-green-50 p-4">
				<h4 className="mb-2 font-medium text-green-800">
					Benefits of Consolidation:
				</h4>
				<ul className="space-y-1 text-sm text-green-700">
					<li>• Single component to maintain</li>
					<li>• Consistent API across all card types</li>
					<li>• Better TypeScript support</li>
					<li>• Easier testing and documentation</li>
					<li>• Backwards compatibility maintained</li>
				</ul>
			</div>
		</div>
	)
}

// All Card Types Demo
export const AllCardTypes: Story = {
	render: () => (
		<div className="w-full max-w-6xl space-y-8">
			{/* Stats Cards */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Statistics Cards</h3>
				<StatsGrid columns={4}>
					<Card
						behavior="stats"
						title="Revenue"
						value="$45,231"
						variant="revenue"
						trend={{ value: 12.5, isPositive: true }}
						icon={<DollarSign className="h-4 w-4" />}
					/>
					<Card
						behavior="stats"
						title="Tenants"
						value="1,234"
						variant="tenants"
						trend={{ value: 8.2, isPositive: true }}
						icon={<Users className="h-4 w-4" />}
					/>
					<Card
						behavior="stats"
						title="Properties"
						value="24"
						variant="properties"
						trend={{ value: 3, isPositive: true }}
						icon={<Building2 className="h-4 w-4" />}
					/>
					<Card
						behavior="stats"
						title="Maintenance"
						value="7"
						variant="maintenance"
						trend={{ value: -15, isPositive: true }}
						icon={<Settings className="h-4 w-4" />}
					/>
				</StatsGrid>
			</div>

			{/* Pricing Cards */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Pricing Cards</h3>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<Card
						behavior="pricing"
						tier={mockFreeTier}
						billingInterval="monthly"
					/>
					<Card
						behavior="pricing"
						tier={mockTier}
						billingInterval="yearly"
					/>
					<Card
						behavior="pricing"
						tier={mockEnterpriseTier}
						billingInterval="monthly"
					/>
				</div>
			</div>

			{/* Property Card */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Property Card</h3>
				<div className="max-w-md">
					<Card
						behavior="property"
						property={mockProperty}
						onEdit={property => console.log('Edit:', property.name)}
						onView={property => console.log('View:', property.name)}
					/>
				</div>
			</div>
		</div>
	)
}
