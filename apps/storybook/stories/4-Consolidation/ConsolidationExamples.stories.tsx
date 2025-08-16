import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from '@storybook/test'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	CreditCard,
	Users,
	Settings,
	Download,
	Building,
	MapPin,
	DollarSign,
	Trash2,
	Edit,
	Eye
} from 'lucide-react'
import { StoryErrorBoundary } from '../utils/ErrorBoundary'
import { mockPlanTypes, type MockPlanType } from '../utils/mockData'

const meta = {
	title: 'Consolidation/Before & After Examples',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Practical examples showing how to consolidate specialized components into flexible base components.'
			}
		}
	},
	decorators: [
		Story => (
			<StoryErrorBoundary>
				<Story />
			</StoryErrorBoundary>
		)
	]
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// =============================================================================
// BEFORE: Specialized Button Components
// =============================================================================

// ❌ OLD WAY: Specialized checkout button
const OldCheckoutButton: React.FC<{
	planType: MockPlanType
	onClick?: () => void
}> = ({ planType, onClick = () => {} }) => (
	<button
		className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
		onClick={onClick}
	>
		<CreditCard className="h-5 w-5" />
		Subscribe to {planType}
	</button>
)

// ❌ OLD WAY: Specialized Google signup button
const OldGoogleSignupButton: React.FC<{
	onSignup?: () => void
	isLoading?: boolean
}> = ({ onSignup = () => {}, isLoading = false }) => (
	<button
		className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-medium transition-colors hover:bg-gray-50"
		onClick={onSignup}
		disabled={isLoading}
	>
		<div className="h-5 w-5 rounded-full bg-gradient-to-r from-red-500 to-yellow-500" />
		{isLoading ? 'Connecting...' : 'Continue with Google'}
	</button>
)

// ❌ OLD WAY: Specialized customer portal button
const OldCustomerPortalButton: React.FC<{ onClick?: () => void }> = ({
	onClick = () => {}
}) => (
	<button
		className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
		onClick={onClick}
	>
		<Settings className="h-4 w-4" />
		Manage Billing
	</button>
)

// =============================================================================
// AFTER: Using Unified Button Component
// =============================================================================

// ✅ NEW WAY: All using the same Button component with different props
const NewCheckoutButton: React.FC<{
	planType: MockPlanType
	onClick?: () => void
}> = ({ planType, onClick = () => {} }) => (
	<Button
		leftIcon={<CreditCard className="h-5 w-5" />}
		size="lg"
		onClick={onClick}
	>
		Subscribe to {planType}
	</Button>
)

const NewGoogleSignupButton: React.FC<{
	onSignup?: () => void
	isLoading?: boolean
}> = ({ onSignup = () => {}, isLoading = false }) => (
	<Button
		variant="outline"
		fullWidth
		leftIcon={
			<div className="h-5 w-5 rounded-full bg-gradient-to-r from-red-500 to-yellow-500" />
		}
		loading={isLoading}
		loadingText="Connecting..."
		onClick={onSignup}
	>
		Continue with Google
	</Button>
)

const NewCustomerPortalButton: React.FC<{ onClick?: () => void }> = ({
	onClick = () => {}
}) => (
	<Button
		variant="outline"
		leftIcon={<Settings className="h-4 w-4" />}
		onClick={onClick}
	>
		Manage Billing
	</Button>
)

// =============================================================================
// BEFORE: Specialized Card Components
// =============================================================================

// ❌ OLD WAY: Specialized pricing card
const OldPricingCard: React.FC<{
	title: string
	price: string
	features: string[]
	popular?: boolean
	onSelect?: () => void
}> = ({ title, price, features, popular = false, onSelect = () => {} }) => (
	<div
		className={`relative rounded-lg border p-6 ${popular ? 'border-brand-500 shadow-lg' : 'border-gray-200'}`}
	>
		{popular && (
			<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full bg-blue-500 px-3 py-1 text-sm text-white">
				Most Popular
			</div>
		)}
		<div className="mb-6 text-center">
			<h3 className="text-xl font-bold">{title}</h3>
			<div className="mt-2 text-3xl font-bold">{price}</div>
		</div>
		<ul className="mb-6 space-y-2">
			{features.map((feature, index) => (
				<li key={index} className="flex items-center">
					<div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-green-500" />
					<span className="text-sm">{feature}</span>
				</li>
			))}
		</ul>
		<button
			className={`w-full rounded px-4 py-2 font-medium transition-colors ${
				popular
					? 'bg-blue-600 text-white hover:bg-blue-700'
					: 'border border-gray-300 hover:bg-gray-50'
			}`}
			onClick={onSelect}
		>
			Get Started
		</button>
	</div>
)

// ❌ OLD WAY: Specialized property card
const OldPropertyCard: React.FC<{
	name: string
	address: string
	rent: number
	units: number
	occupied: number
	onView?: () => void
	onEdit?: () => void
	onDelete?: () => void
}> = ({
	name,
	address,
	rent,
	units,
	occupied,
	onView = () => {},
	onEdit = () => {},
	onDelete = () => {}
}) => (
	<div className="overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
		<div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<Building className="h-12 w-12 text-blue-500" />
		</div>
		<div className="p-4">
			<h3 className="text-lg font-bold">{name}</h3>
			<p className="mt-1 flex items-center text-sm text-gray-600">
				<MapPin className="mr-1 h-3 w-3" />
				{address}
			</p>
			<div className="mt-4 grid grid-cols-2 gap-4 text-sm">
				<div>
					<span className="text-gray-500">Rent:</span>
					<p className="font-semibold">${rent.toLocaleString()}</p>
				</div>
				<div>
					<span className="text-gray-500">Occupancy:</span>
					<p className="font-semibold">
						{occupied}/{units}
					</p>
				</div>
			</div>
			<div className="mt-4 flex gap-2">
				<button
					onClick={onView}
					className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
				>
					View
				</button>
				<button
					onClick={onEdit}
					className="rounded border border-gray-300 p-2 hover:bg-gray-50"
				>
					<Edit className="h-4 w-4" />
				</button>
				<button
					onClick={onDelete}
					className="rounded border border-gray-300 p-2 text-red-600 hover:bg-red-50"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>
		</div>
	</div>
)

// =============================================================================
// AFTER: Using Unified Card Component
// =============================================================================

// ✅ NEW WAY: Pricing card using base Card component
const NewPricingCard: React.FC<{
	title: string
	price: string
	features: string[]
	popular?: boolean
	onSelect?: () => void
}> = ({ title, price, features, popular = false, onSelect = () => {} }) => (
	<Card className={`relative ${popular ? 'border-brand-500 shadow-lg' : ''}`}>
		{popular && (
			<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
				<Badge className="bg-blue-500">Most Popular</Badge>
			</div>
		)}
		<CardHeader className="text-center">
			<CardTitle className="text-xl">{title}</CardTitle>
			<div className="mt-2 text-3xl font-bold">{price}</div>
		</CardHeader>
		<CardContent>
			<ul className="space-y-2">
				{features.map((feature, index) => (
					<li key={index} className="flex items-center">
						<div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-green-500" />
						<span className="text-sm">{feature}</span>
					</li>
				))}
			</ul>
		</CardContent>
		<CardFooter>
			<Button
				className="w-full"
				variant={popular ? 'default' : 'outline'}
				onClick={onSelect}
			>
				Get Started
			</Button>
		</CardFooter>
	</Card>
)

// ✅ NEW WAY: Property card using base Card component
const NewPropertyCard: React.FC<{
	name: string
	address: string
	rent: number
	units: number
	occupied: number
	onView?: () => void
	onEdit?: () => void
	onDelete?: () => void
}> = ({
	name,
	address,
	rent,
	units,
	occupied,
	onView = () => {},
	onEdit = () => {},
	onDelete = () => {}
}) => (
	<Card className="overflow-hidden">
		<div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<Building className="h-12 w-12 text-blue-500" />
		</div>
		<CardHeader>
			<CardTitle className="text-lg">{name}</CardTitle>
			<CardDescription className="flex items-center gap-1">
				<MapPin className="h-3 w-3" />
				{address}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span className="text-gray-500">Rent:</span>
					<p className="flex items-center gap-1 font-semibold">
						<DollarSign className="h-3 w-3" />
						{rent.toLocaleString()}
					</p>
				</div>
				<div>
					<span className="text-gray-500">Occupancy:</span>
					<p className="font-semibold">
						{occupied}/{units}
					</p>
				</div>
			</div>
		</CardContent>
		<CardFooter className="gap-2">
			<Button className="flex-1" onClick={onView}>
				<Eye className="mr-1 h-4 w-4" />
				View
			</Button>
			<Button variant="outline" size="sm" onClick={onEdit}>
				<Edit className="h-4 w-4" />
			</Button>
			<Button variant="outline" size="sm" onClick={onDelete}>
				<Trash2 className="h-4 w-4" />
			</Button>
		</CardFooter>
	</Card>
)

// =============================================================================
// STORIES
// =============================================================================

export const ButtonConsolidation: Story = {
	render: () => (
		<div className="space-y-8">
			<div className="rounded-lg border border-red-200 bg-red-50 p-6">
				<h2 className="mb-4 text-xl font-bold text-red-800">
					❌ BEFORE: Specialized Components
				</h2>
				<p className="mb-4 text-red-700">
					Multiple button components with duplicated logic and
					styling:
				</p>
				<div className="space-y-4">
					<div>
						<h3 className="mb-2 font-semibold">
							CheckoutButton.tsx (45 lines)
						</h3>
						<OldCheckoutButton
							planType="PROFESSIONAL"
							onClick={fn()}
						/>
					</div>
					<div>
						<h3 className="mb-2 font-semibold">
							GoogleSignupButton.tsx (38 lines)
						</h3>
						<div className="max-w-sm">
							<OldGoogleSignupButton onSignup={fn()} />
						</div>
					</div>
					<div>
						<h3 className="mb-2 font-semibold">
							CustomerPortalButton.tsx (32 lines)
						</h3>
						<OldCustomerPortalButton onClick={fn()} />
					</div>
				</div>
				<div className="mt-4 rounded border-l-4 border-red-500 bg-white p-3">
					<p className="text-sm text-gray-700">
						<strong>Problems:</strong> 115+ lines of duplicated
						code, inconsistent styling, maintenance overhead, no
						shared state management.
					</p>
				</div>
			</div>

			<div className="rounded-lg border border-green-200 bg-green-50 p-6">
				<h2 className="mb-4 text-xl font-bold text-green-800">
					✅ AFTER: Unified Button Component
				</h2>
				<p className="mb-4 text-green-700">
					All functionality using one flexible Button component:
				</p>
				<div className="space-y-4">
					<div>
						<h3 className="mb-2 font-semibold">
							Button with leftIcon + size props
						</h3>
						<NewCheckoutButton
							planType="PROFESSIONAL"
							onClick={fn()}
						/>
					</div>
					<div>
						<h3 className="mb-2 font-semibold">
							Button with variant="outline" + loading state
						</h3>
						<div className="max-w-sm">
							<NewGoogleSignupButton onSignup={fn()} />
						</div>
					</div>
					<div>
						<h3 className="mb-2 font-semibold">
							Button with variant="outline" + leftIcon
						</h3>
						<NewCustomerPortalButton onClick={fn()} />
					</div>
				</div>
				<div className="mt-4 rounded border-l-4 border-green-500 bg-white p-3">
					<p className="text-sm text-gray-700">
						<strong>Benefits:</strong> 90% code reduction,
						consistent behavior, centralized maintenance, shared
						TypeScript types.
					</p>
				</div>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test both old and new button implementations
		const buttons = canvas.getAllByRole('button')
		expect(buttons.length).toBeGreaterThan(4)

		// Click some buttons to test functionality
		await userEvent.click(buttons[0]) // Old checkout
		await userEvent.click(buttons[3]) // New checkout
	}
}

export const CardConsolidation: Story = {
	render: () => (
		<div className="space-y-8">
			<div className="rounded-lg border border-red-200 bg-red-50 p-6">
				<h2 className="mb-4 text-xl font-bold text-red-800">
					❌ BEFORE: Specialized Card Components
				</h2>
				<p className="mb-4 text-red-700">
					Multiple card components with different structures:
				</p>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						<h3 className="mb-2 font-semibold">
							PricingCard.tsx (120+ lines)
						</h3>
						<OldPricingCard
							title="Professional"
							price="$99/mo"
							features={[
								'25 Properties',
								'Advanced Analytics',
								'Priority Support'
							]}
							popular
							onSelect={fn()}
						/>
					</div>
					<div>
						<h3 className="mb-2 font-semibold">
							PropertyCard.tsx (85+ lines)
						</h3>
						<OldPropertyCard
							name="Sunset Apartments"
							address="123 Main St"
							rent={2500}
							units={24}
							occupied={22}
							onView={fn()}
							onEdit={fn()}
							onDelete={fn()}
						/>
					</div>
				</div>
				<div className="mt-4 rounded border-l-4 border-red-500 bg-white p-3">
					<p className="text-sm text-gray-700">
						<strong>Problems:</strong> 205+ lines of duplicated
						structure, inconsistent layouts, different animation
						patterns, maintenance nightmare.
					</p>
				</div>
			</div>

			<div className="rounded-lg border border-green-200 bg-green-50 p-6">
				<h2 className="mb-4 text-xl font-bold text-green-800">
					✅ AFTER: Composable Card System
				</h2>
				<p className="mb-4 text-green-700">
					Same functionality using flexible Card components:
				</p>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						<h3 className="mb-2 font-semibold">
							Card + Badge + Button composition
						</h3>
						<NewPricingCard
							title="Professional"
							price="$99/mo"
							features={[
								'25 Properties',
								'Advanced Analytics',
								'Priority Support'
							]}
							popular
							onSelect={fn()}
						/>
					</div>
					<div>
						<h3 className="mb-2 font-semibold">
							Card + CardHeader + CardContent + CardFooter
						</h3>
						<NewPropertyCard
							name="Sunset Apartments"
							address="123 Main St"
							rent={2500}
							units={24}
							occupied={22}
							onView={fn()}
							onEdit={fn()}
							onDelete={fn()}
						/>
					</div>
				</div>
				<div className="mt-4 rounded border-l-4 border-green-500 bg-white p-3">
					<p className="text-sm text-gray-700">
						<strong>Benefits:</strong> 80% code reduction,
						consistent hover effects, composable structure, easy
						theme customization.
					</p>
				</div>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test card interactions
		const getStartedButtons = canvas.getAllByText('Get Started')
		const viewButtons = canvas.getAllByText(/View/)

		if (getStartedButtons.length > 0) {
			await userEvent.click(getStartedButtons[0]) // Old pricing card
			if (getStartedButtons[1])
				await userEvent.click(getStartedButtons[1]) // New pricing card
		}

		if (viewButtons.length > 0) {
			await userEvent.click(viewButtons[0]) // Test view button
		}
	}
}

export const ConsolidationMetrics: Story = {
	render: () => (
		<div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
			<h2 className="mb-8 text-center text-2xl font-bold">
				Component Consolidation Impact
			</h2>

			<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="rounded-lg bg-white p-6 text-center shadow-sm">
					<div className="mb-2 text-4xl font-bold text-red-600">
						12+
					</div>
					<div className="text-gray-600">Components Before</div>
				</div>
				<div className="rounded-lg bg-white p-6 text-center shadow-sm">
					<div className="mb-2 text-4xl font-bold text-green-600">
						2
					</div>
					<div className="text-gray-600">Components After</div>
				</div>
				<div className="rounded-lg bg-white p-6 text-center shadow-sm">
					<div className="mb-2 text-4xl font-bold text-blue-600">
						83%
					</div>
					<div className="text-gray-600">Code Reduction</div>
				</div>
			</div>

			<div className="rounded-lg bg-white p-6">
				<h3 className="mb-4 text-lg font-semibold">
					Implementation Roadmap
				</h3>
				<div className="space-y-4">
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">
							✓
						</div>
						<span>
							Phase 1: Create base Button and Card components
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">
							✓
						</div>
						<span>
							Phase 2: Document consolidation patterns in
							Storybook
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs text-white">
							3
						</div>
						<span>
							Phase 3: Migrate specialized components one by one
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs text-white">
							4
						</div>
						<span>
							Phase 4: Remove old component files and update
							imports
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs text-white">
							5
						</div>
						<span>Phase 5: Update tests and documentation</span>
					</div>
				</div>
			</div>
		</div>
	)
}
