import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Import all button-like components to audit
import { Button } from '@/components/ui/button'
// import { CheckoutButton } from '@/components/billing/checkout-button';
// import { GoogleSignupButton } from '@/components/auth/google-signup-button';
// Import more as we discover them...

const meta = {
	title: 'Audit/Component Inventory',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Complete inventory of all components in TenantFlow to identify consolidation opportunities.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ButtonInventory: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-4 text-2xl font-bold">
					Button Components (Found: Multiple Variants)
				</h2>
				<div className="mb-4 grid grid-cols-4 gap-4">
					<div className="text-center">
						<Button>Default Button</Button>
						<p className="mt-2 text-xs text-gray-500">
							ui/button.tsx
						</p>
					</div>
					<div className="text-center">
						<Button variant="destructive">Destructive</Button>
						<p className="mt-2 text-xs text-gray-500">
							ui/button.tsx
						</p>
					</div>
					<div className="text-center">
						<Button variant="outline">Outline</Button>
						<p className="mt-2 text-xs text-gray-500">
							ui/button.tsx
						</p>
					</div>
					<div className="text-center">
						<Button variant="secondary">Secondary</Button>
						<p className="mt-2 text-xs text-gray-500">
							ui/button.tsx
						</p>
					</div>
					<div className="text-center">
						<Button variant="ghost">Ghost</Button>
						<p className="mt-2 text-xs text-gray-500">
							ui/button.tsx
						</p>
					</div>
					<div className="text-center">
						<Button variant="link">Link</Button>
						<p className="mt-2 text-xs text-gray-500">
							ui/button.tsx
						</p>
					</div>
					{/* Add more button components as we find them */}
				</div>
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<p className="text-sm text-green-800">
						✅ <strong>Consolidation Opportunity:</strong> All
						button variants can use the base Button component with
						different props
					</p>
				</div>
			</section>
		</div>
	)
}

export const CardInventory: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-4 text-2xl font-bold">
					Card Components (Found: 12+ Variants)
				</h2>
				<div className="grid grid-cols-3 gap-6">
					{/* We'll add actual card components here */}
					<div className="rounded-lg border p-4">
						<h3 className="font-semibold">Basic Card</h3>
						<p className="text-sm text-gray-600">ui/card.tsx</p>
					</div>
					<div className="rounded-lg border p-4">
						<h3 className="font-semibold">Stats Card</h3>
						<p className="text-sm text-gray-600">
							ui/stats-card.tsx
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<h3 className="font-semibold">Property Card</h3>
						<p className="text-sm text-gray-600">
							properties/property-card.tsx
						</p>
					</div>
				</div>
				<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
					<p className="text-sm text-amber-800">
						⚠️ <strong>High Duplication:</strong> Multiple card
						implementations doing similar things. Can be reduced to
						1-2 flexible components.
					</p>
				</div>
			</section>
		</div>
	)
}

export const FormInventory: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-4 text-2xl font-bold">Form Components</h2>
				<div className="space-y-4">
					<div className="rounded-lg border p-4">
						<h3 className="mb-2 font-semibold">Property Forms</h3>
						<ul className="space-y-1 text-sm text-gray-600">
							<li>• property-form.tsx</li>
							<li>• property-form-client.tsx</li>
							<li>• property-form-actions.tsx</li>
							<li>• property-form-basic-info.tsx</li>
							<li>• property-form-features.tsx</li>
						</ul>
					</div>
					<div className="rounded-lg border p-4">
						<h3 className="mb-2 font-semibold">Auth Forms</h3>
						<ul className="space-y-1 text-sm text-gray-600">
							<li>• login-form.tsx</li>
							<li>• enhanced-login-form.tsx</li>
							<li>• signup-form.tsx</li>
							<li>• enhanced-signup-form.tsx</li>
						</ul>
					</div>
				</div>
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
					<p className="text-sm text-red-800">
						🔴 <strong>Critical Duplication:</strong> Many form
						components can be consolidated using composition
						patterns
					</p>
				</div>
			</section>
		</div>
	)
}

export const LoadingStateInventory: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-4 text-2xl font-bold">Loading States</h2>
				<div className="grid grid-cols-4 gap-4">
					<div className="space-y-2 rounded-lg border p-4">
						<div className="h-4 animate-pulse rounded bg-gray-200"></div>
						<div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
						<p className="mt-2 text-xs text-gray-500">Skeleton</p>
					</div>
					<div className="flex justify-center rounded-lg border p-4">
						<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
						<p className="mt-2 text-xs text-gray-500">Spinner</p>
					</div>
				</div>
				<div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
					<p className="text-sm text-green-800">
						✅ <strong>Good Opportunity:</strong> Standardize on
						Skeleton component with variants
					</p>
				</div>
			</section>
		</div>
	)
}

export const ConsolidationSummary: Story = {
	render: () => (
		<div className="p-8">
			<h1 className="mb-8 text-3xl font-bold">
				Component Consolidation Plan
			</h1>

			<div className="space-y-6">
				<div className="rounded-lg border bg-white p-6">
					<h2 className="mb-4 text-xl font-semibold text-red-600">
						High Priority (60%+ Reduction)
					</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h3 className="font-medium">Current State</h3>
							<ul className="space-y-1 text-sm text-gray-600">
								<li>• 8+ Button variants</li>
								<li>• 12+ Card types</li>
								<li>• 6+ Modal types</li>
								<li>• 5+ Form layouts</li>
							</ul>
						</div>
						<div>
							<h3 className="font-medium">Target State</h3>
							<ul className="space-y-1 text-sm text-green-600">
								<li>• 1 Button component</li>
								<li>• 1 Card component</li>
								<li>• 1 Modal component</li>
								<li>• 1 Form component</li>
							</ul>
						</div>
					</div>
				</div>

				<div className="rounded-lg border bg-white p-6">
					<h2 className="mb-4 text-xl font-semibold text-amber-600">
						Medium Priority (40%+ Reduction)
					</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h3 className="font-medium">Current State</h3>
							<ul className="space-y-1 text-sm text-gray-600">
								<li>• 7+ Loading states</li>
								<li>• 4+ Table types</li>
								<li>• Multiple navigation components</li>
							</ul>
						</div>
						<div>
							<h3 className="font-medium">Target State</h3>
							<ul className="space-y-1 text-sm text-green-600">
								<li>• 1 Skeleton component</li>
								<li>• 1 DataTable component</li>
								<li>• 1 Navigation system</li>
							</ul>
						</div>
					</div>
				</div>

				<div className="mt-8 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
					<h3 className="mb-2 text-lg font-semibold">
						Expected Impact
					</h3>
					<div className="grid grid-cols-3 gap-4 text-center">
						<div>
							<div className="text-3xl font-bold text-blue-600">
								60%
							</div>
							<div className="text-sm text-gray-600">
								Fewer Components
							</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-green-600">
								50%
							</div>
							<div className="text-sm text-gray-600">
								Less Code
							</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-purple-600">
								3x
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
