import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from '@storybook/test'
import {
	Button,
	ButtonGroup,
	IconButton,
	CTAButton,
	LoadingButton,
	SplitButton,
	FloatingActionButton
} from '@/components/ui/button'
import {
	Plus,
	Search,
	Download,
	Settings,
	ChevronRight,
	Heart,
	Star,
	Share2,
	Trash,
	Edit,
	Save,
	X
} from 'lucide-react'

const meta = {
	title: 'Components/Button',
	component: Button,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Consolidated button system with all variants and patterns.'
			}
		}
	},
	argTypes: {
		variant: {
			control: 'select',
			options: [
				'default',
				'destructive',
				'outline',
				'secondary',
				'ghost',
				'link',
				'cta',
				'success',
				'warning'
			]
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'xl', 'icon']
		},
		fullWidth: {
			control: 'boolean'
		},
		loading: {
			control: 'boolean'
		},
		disabled: {
			control: 'boolean'
		},
		animate: {
			control: 'boolean'
		}
	}
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// Basic Button Variants
export const Default: Story = {
	args: {
		children: 'Button'
	}
}

export const AllVariants: Story = {
	render: () => (
		<div className="space-y-6">
			{/* Primary Brand Variants */}
			<div>
				<h3 className="mb-3 text-lg font-semibold text-gray-800">
					Brand & CTA Variants
				</h3>
				<div className="flex flex-wrap gap-4">
					<Button variant="default">Default</Button>
					<Button variant="cta">CTA Primary</Button>
					<Button variant="gradient">Gradient</Button>
					<Button variant="premium">Premium</Button>
					<Button variant="simplify">Simplify</Button>
				</div>
			</div>

			{/* Standard Variants */}
			<div>
				<h3 className="mb-3 text-lg font-semibold text-gray-800">
					Standard Variants
				</h3>
				<div className="flex flex-wrap gap-4">
					<Button variant="outline">Outline</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="link">Link</Button>
				</div>
			</div>

			{/* Semantic Variants */}
			<div>
				<h3 className="mb-3 text-lg font-semibold text-gray-800">
					Semantic Variants
				</h3>
				<div className="flex flex-wrap gap-4">
					<Button variant="success">Success</Button>
					<Button variant="warning">Warning</Button>
					<Button variant="destructive">Destructive</Button>
				</div>
			</div>

			{/* Special Variants */}
			<div>
				<h3 className="mb-3 text-lg font-semibold text-gray-800">
					Special Variants
				</h3>
				<div className="flex flex-wrap gap-4">
					<Button variant="glass">Glass</Button>
					<Button variant="loading" loading>
						Loading
					</Button>
				</div>
			</div>
		</div>
	)
}

export const AllSizes: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-4">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="xl">Extra Large</Button>
			<Button size="icon" aria-label="Settings">
				<Settings className="h-4 w-4" />
			</Button>
		</div>
	)
}

// States
export const States: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex gap-4">
				<Button>Normal</Button>
				<Button disabled>Disabled</Button>
				<Button loading>Loading</Button>
				<Button loading loadingText="Processing...">
					Submit
				</Button>
			</div>
			<div className="flex gap-4">
				<Button variant="outline">Normal</Button>
				<Button variant="outline" disabled>
					Disabled
				</Button>
				<Button variant="outline" loading>
					Loading
				</Button>
			</div>
		</div>
	)
}

// Icons
export const WithIcons: Story = {
	render: () => (
		<div className="flex flex-wrap gap-4">
			<Button leftIcon={<Plus className="h-4 w-4" />}>Add Item</Button>
			<Button rightIcon={<ChevronRight className="h-4 w-4" />}>
				Continue
			</Button>
			<Button
				leftIcon={<Download className="h-4 w-4" />}
				rightIcon={<ChevronRight className="h-4 w-4" />}
			>
				Download
			</Button>
			<Button
				variant="destructive"
				leftIcon={<Trash className="h-4 w-4" />}
			>
				Delete
			</Button>
			<Button variant="success" leftIcon={<Save className="h-4 w-4" />}>
				Save
			</Button>
		</div>
	)
}

// Icon Buttons
export const IconButtons: Story = {
	render: () => (
		<div className="flex gap-4">
			<IconButton icon={<Search className="h-4 w-4" />} label="Search" />
			<IconButton
				icon={<Heart className="h-4 w-4" />}
				label="Like"
				variant="outline"
			/>
			<IconButton
				icon={<Settings className="h-4 w-4" />}
				label="Settings"
				variant="ghost"
			/>
			<IconButton
				icon={<Star className="h-4 w-4" />}
				label="Favorite"
				variant="secondary"
			/>
			<IconButton
				icon={<Share2 className="h-4 w-4" />}
				label="Share"
				rotate
			/>
		</div>
	)
}

// Button Groups
export const Groups: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<p className="mb-2 text-sm text-gray-600">Horizontal Group</p>
				<ButtonGroup>
					<Button variant="outline">Left</Button>
					<Button variant="outline">Center</Button>
					<Button variant="outline">Right</Button>
				</ButtonGroup>
			</div>
			<div>
				<p className="mb-2 text-sm text-gray-600">Attached Group</p>
				<ButtonGroup attach>
					<Button variant="outline">First</Button>
					<Button variant="outline">Second</Button>
					<Button variant="outline">Third</Button>
				</ButtonGroup>
			</div>
			<div>
				<p className="mb-2 text-sm text-gray-600">Vertical Group</p>
				<ButtonGroup orientation="vertical">
					<Button variant="outline" fullWidth>
						Top
					</Button>
					<Button variant="outline" fullWidth>
						Middle
					</Button>
					<Button variant="outline" fullWidth>
						Bottom
					</Button>
				</ButtonGroup>
			</div>
		</div>
	)
}

// Brand & CTA Showcase
export const BrandShowcase: Story = {
	render: () => (
		<div className="space-y-8">
			<div className="text-center">
				<h2 className="mb-4 text-2xl font-bold text-gray-800">
					TenantFlow Brand Button System
				</h2>
				<p className="text-gray-600">
					Showcasing the "Simplify" gradient system and brand
					consistency
				</p>
			</div>

			{/* Hero CTA Buttons */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-800">
					Hero & Primary CTAs
				</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-3">
						<Button variant="simplify" size="lg" className="w-full">
							Start Free Trial
						</Button>
						<p className="text-center text-xs text-gray-600">
							<code>variant="simplify"</code> - Primary brand CTA
						</p>
					</div>
					<div className="space-y-3">
						<Button variant="gradient" size="lg" className="w-full">
							Get Started Today
						</Button>
						<p className="text-center text-xs text-gray-600">
							<code>variant="gradient"</code> - Enhanced gradient
						</p>
					</div>
					<div className="space-y-3">
						<Button variant="premium" size="lg" className="w-full">
							Go Premium
						</Button>
						<p className="text-center text-xs text-gray-600">
							<code>variant="premium"</code> - Premium features
						</p>
					</div>
				</div>
			</div>

			{/* Interactive Effects */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-800">
					Interactive & Enhanced CTAs
				</h3>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-4">
						<CTAButton glow>Enhanced with Glow</CTAButton>
						<CTAButton pulse>Attention-grabbing Pulse</CTAButton>
						<CTAButton glow pulse>
							Ultimate CTA (Glow + Pulse)
						</CTAButton>
					</div>
					<div className="space-y-4">
						<CTAButton priority="secondary">
							Secondary Action
						</CTAButton>
						<Button variant="outline" className="hover-simplify">
							Hover for Brand Effect
						</Button>
						<Button variant="ghost" className="focus-simplify">
							Focus for Brand Ring
						</Button>
					</div>
				</div>
			</div>

			{/* Size Variations with Brand */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-800">
					Brand CTA Sizes
				</h3>
				<div className="flex flex-wrap items-center gap-4">
					<Button variant="simplify" size="sm">
						Small CTA
					</Button>
					<Button variant="simplify" size="default">
						Default CTA
					</Button>
					<Button variant="simplify" size="lg">
						Large CTA
					</Button>
					<Button variant="simplify" size="xl">
						Extra Large CTA
					</Button>
				</div>
			</div>

			{/* Guidelines */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
				<h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-800">
					<span className="text-blue-600">📋</span>
					Brand Button Guidelines
				</h3>
				<div className="grid grid-cols-1 gap-4 text-sm text-blue-700 md:grid-cols-2">
					<div>
						<h4 className="mb-2 font-medium">Primary Usage</h4>
						<ul className="space-y-1">
							<li>• Use "simplify" variant for main CTAs</li>
							<li>• Reserve "premium" for upgrade actions</li>
							<li>• Apply "gradient" for hero sections</li>
							<li>• Limit to 1-2 brand CTAs per view</li>
						</ul>
					</div>
					<div>
						<h4 className="mb-2 font-medium">
							Enhancement Guidelines
						</h4>
						<ul className="space-y-1">
							<li>• Use glow effect sparingly for emphasis</li>
							<li>• Apply pulse for time-sensitive actions</li>
							<li>• Combine effects only for primary CTAs</li>
							<li>• Maintain accessibility standards</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}

// CTA Buttons (Legacy - preserved for compatibility)
export const CTAButtons: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex gap-4">
				<CTAButton>Get Started</CTAButton>
				<CTAButton priority="secondary">Learn More</CTAButton>
			</div>
			<div className="flex gap-4">
				<CTAButton glow>Glowing CTA</CTAButton>
				<CTAButton pulse>Pulsing CTA</CTAButton>
				<CTAButton glow pulse>
					Glow + Pulse
				</CTAButton>
			</div>
		</div>
	)
}

// Loading Buttons
export const LoadingVariants: Story = {
	render: () => (
		<div className="flex gap-4">
			<LoadingButton loading loadingVariant="spinner">
				Spinner
			</LoadingButton>
			<LoadingButton loading loadingVariant="dots">
				Dots
			</LoadingButton>
			<LoadingButton loading loadingVariant="shimmer">
				Shimmer
			</LoadingButton>
		</div>
	)
}

// Split Button
export const SplitButtons: Story = {
	render: () => (
		<div className="flex gap-4">
			<SplitButton
				mainAction={{
					label: 'Save',
					onClick: () => console.log('Save')
				}}
				dropdownActions={[
					{
						label: 'Save as draft',
						onClick: () => console.log('Draft'),
						icon: <Edit className="h-4 w-4" />
					},
					{
						label: 'Save and publish',
						onClick: () => console.log('Publish'),
						icon: <Save className="h-4 w-4" />
					},
					{
						label: 'Discard',
						onClick: () => console.log('Discard'),
						icon: <X className="h-4 w-4" />,
						destructive: true
					}
				]}
			/>
			<SplitButton
				variant="outline"
				mainAction={{
					label: 'Export',
					onClick: () => console.log('Export')
				}}
				dropdownActions={[
					{
						label: 'Export as PDF',
						onClick: () => console.log('PDF')
					},
					{
						label: 'Export as CSV',
						onClick: () => console.log('CSV')
					},
					{
						label: 'Export as Excel',
						onClick: () => console.log('Excel')
					}
				]}
			/>
		</div>
	)
}

// Floating Action Button
export const FloatingButtons: Story = {
	render: () => (
		<div className="relative h-64">
			<FloatingActionButton position="bottom-right">
				<Plus className="h-6 w-6" />
			</FloatingActionButton>
			<FloatingActionButton position="bottom-left" variant="secondary">
				<Settings className="h-6 w-6" />
			</FloatingActionButton>
			<FloatingActionButton position="top-right" variant="outline">
				<Search className="h-6 w-6" />
			</FloatingActionButton>
			<FloatingActionButton position="top-left" variant="destructive">
				<X className="h-6 w-6" />
			</FloatingActionButton>
		</div>
	)
}

// Special Purpose Buttons (To Be Consolidated)
export const SpecialPurposeButtons: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
				<h3 className="mb-3 font-semibold text-amber-800">
					⚠️ To Be Consolidated
				</h3>
				<p className="mb-4 text-sm text-amber-700">
					These special-purpose buttons can be replaced with the base
					Button component using appropriate props.
				</p>
				<div className="space-y-4">
					<div>
						<p className="mb-2 text-xs text-gray-600">
							Checkout Button (billing/checkout-button.tsx)
						</p>
						<Button
							variant="cta"
							className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
						>
							Subscribe to Starter - $29/mo
						</Button>
						<p className="mt-1 text-xs text-green-600">
							→ Can use: Button with leftIcon and onClick handler
						</p>
					</div>

					<div>
						<p className="mb-2 text-xs text-gray-600">
							Customer Portal Button
							(billing/customer-portal-button.tsx)
						</p>
						<Button variant="outline">
							<Settings className="mr-2 h-4 w-4" />
							Manage Billing
						</Button>
						<p className="mt-1 text-xs text-green-600">
							→ Can use: Button variant="outline" with async
							onClick
						</p>
					</div>

					<div>
						<p className="mb-2 text-xs text-gray-600">
							Google Signup Button (auth/google-signup-button.tsx)
						</p>
						<Button
							variant="outline"
							className="border-gray-300 bg-white"
						>
							<div className="mr-2 h-4 w-4 rounded-sm bg-red-500" />
							Continue with Google
						</Button>
						<p className="mt-1 text-xs text-green-600">
							→ Can use: Button with Google icon and loading state
						</p>
					</div>

					<div>
						<p className="mb-2 text-xs text-gray-600">
							Hosted Checkout Button
							(billing/hosted-checkout-button.tsx)
						</p>
						<CTAButton>Start Pro Trial</CTAButton>
						<p className="mt-1 text-xs text-green-600">
							→ Can use: CTAButton with async handler
						</p>
					</div>

					<div>
						<p className="mb-2 text-xs text-gray-600">
							Track Button (analytics/track-button.tsx)
						</p>
						<TrackButton
							trackEvent="button_click"
							trackProperties={{ location: 'storybook' }}
						>
							Track Event
						</TrackButton>
						<p className="mt-1 text-xs text-green-600">
							→ Can use: Button with analytics in onClick
						</p>
					</div>
				</div>
			</div>

			<div className="rounded-lg border border-green-200 bg-green-50 p-4">
				<h3 className="mb-3 font-semibold text-green-800">
					✅ Consolidation Benefits
				</h3>
				<ul className="space-y-1 text-sm text-green-700">
					<li>
						• Reduce from 10+ button components to 1 flexible
						component
					</li>
					<li>• Consistent styling and behavior across the app</li>
					<li>• Easier maintenance and updates</li>
					<li>• Better TypeScript support and type safety</li>
					<li>• Reduced bundle size</li>
				</ul>
			</div>
		</div>
	)
}

// Interactive Testing
export const InteractiveTesting: Story = {
	render: () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">
				Interactive Button Testing
			</h3>
			<div className="space-y-4">
				<div className="flex gap-4">
					<Button onClick={fn()} data-testid="click-test">
						Click Test
					</Button>
					<Button
						variant="outline"
						onClick={fn()}
						data-testid="outline-test"
					>
						Outline Test
					</Button>
					<Button
						variant="destructive"
						onClick={fn()}
						data-testid="destructive-test"
					>
						Destructive Test
					</Button>
				</div>
				<div className="flex gap-4">
					<Button disabled onClick={fn()}>
						Disabled
					</Button>
					<Button loading onClick={fn()}>
						Loading
					</Button>
					<Button
						leftIcon={<Plus className="h-4 w-4" />}
						onClick={fn()}
					>
						With Icon
					</Button>
				</div>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test basic button click
		const clickTest = canvas.getByTestId('click-test')
		await userEvent.click(clickTest)

		// Test outline button click
		const outlineTest = canvas.getByTestId('outline-test')
		await userEvent.click(outlineTest)

		// Test keyboard navigation
		clickTest.focus()
		await userEvent.keyboard('{Enter}')

		// Test space key activation
		await userEvent.keyboard('{Space}')
	}
}

// Form Integration Testing
export const FormIntegration: Story = {
	render: () => {
		const [formData, setFormData] = React.useState({ name: '', email: '' })
		const [isSubmitting, setIsSubmitting] = React.useState(false)

		const handleSubmit = async (e: React.FormEvent) => {
			e.preventDefault()
			setIsSubmitting(true)
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000))
			setIsSubmitting(false)
			console.log('Form submitted:', formData)
		}

		return (
			<form onSubmit={handleSubmit} className="max-w-md space-y-4">
				<div>
					<label className="mb-1 block text-sm font-medium">
						Name
					</label>
					<input
						type="text"
						value={formData.name}
						onChange={e =>
							setFormData(prev => ({
								...prev,
								name: e.target.value
							}))
						}
						className="w-full rounded-md border px-3 py-2"
						data-testid="name-input"
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium">
						Email
					</label>
					<input
						type="email"
						value={formData.email}
						onChange={e =>
							setFormData(prev => ({
								...prev,
								email: e.target.value
							}))
						}
						className="w-full rounded-md border px-3 py-2"
						data-testid="email-input"
					/>
				</div>
				<div className="flex gap-2">
					<Button
						type="submit"
						loading={isSubmitting}
						disabled={!formData.name || !formData.email}
						data-testid="submit-button"
					>
						{isSubmitting ? 'Submitting...' : 'Submit'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => setFormData({ name: '', email: '' })}
						data-testid="reset-button"
					>
						Reset
					</Button>
				</div>
			</form>
		)
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test form interaction
		const nameInput = canvas.getByTestId('name-input')
		const emailInput = canvas.getByTestId('email-input')
		const submitButton = canvas.getByTestId('submit-button')

		// Initially submit should be disabled
		expect(submitButton).toBeDisabled()

		// Fill form
		await userEvent.type(nameInput, 'John Doe')
		await userEvent.type(emailInput, 'john@example.com')

		// Submit should now be enabled
		expect(submitButton).not.toBeDisabled()

		// Test reset
		const resetButton = canvas.getByTestId('reset-button')
		await userEvent.click(resetButton)

		expect(nameInput).toHaveValue('')
		expect(emailInput).toHaveValue('')
	}
}

// Error States and Boundaries
export const ErrorStates: Story = {
	render: () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Error States & Edge Cases</h3>
			<div className="space-y-4">
				<div>
					<p className="mb-2 text-sm text-gray-600">
						Button with very long text
					</p>
					<Button className="max-w-xs">
						This is a button with extremely long text that should
						handle overflow gracefully
					</Button>
				</div>
				<div>
					<p className="mb-2 text-sm text-gray-600">
						Button with special characters
					</p>
					<Button>Save & Continue → ✓</Button>
				</div>
				<div>
					<p className="mb-2 text-sm text-gray-600">
						Button with null/undefined children
					</p>
					<Button>{null}</Button>
					<Button className="ml-2">{undefined}</Button>
				</div>
				<div>
					<p className="mb-2 text-sm text-gray-600">
						Button stress test (rapid clicking)
					</p>
					<Button
						onClick={fn()}
						data-testid="stress-test"
						className="select-none"
					>
						Rapid Click Test
					</Button>
				</div>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const stressButton = canvas.getByTestId('stress-test')

		// Rapid clicking test
		for (let i = 0; i < 5; i++) {
			await userEvent.click(stressButton)
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}
}

// Interactive Playground
export const Playground: Story = {
	args: {
		children: 'Playground Button',
		variant: 'default',
		size: 'default',
		fullWidth: false,
		loading: false,
		disabled: false,
		animate: false,
		onClick: fn()
	},
	argTypes: {
		onClick: { action: 'clicked' }
	}
}
