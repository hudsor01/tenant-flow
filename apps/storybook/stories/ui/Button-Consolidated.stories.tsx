import type { Meta, StoryObj } from '@storybook/react'
import { Button, ButtonGroup } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import {
	Play,
	Download,
	Heart,
	Star,
	Plus,
	Save,
	Delete,
	Edit,
	Share,
	RefreshCw,
	Zap,
	CircleCheckBig,
	X,
	Settings,
	ShoppingCart,
	PlusIcon,
	Trash2
} from 'lucide-react'

const meta: Meta<typeof Button> = {
	title: 'UI/Button (Consolidated)',
	component: Button,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
# Consolidated Button Component

A single, powerful button component that handles all use cases through props and behaviors:

## Key Features
- **Single Component**: One Button component handles all use cases
- **Behavior-based**: Use \`behavior\` prop to specify specialized functionality
- **Prop-based Configuration**: All features accessible through props
- **Backwards Compatibility**: Legacy components still available as aliases

## Behaviors
- \`default\`: Standard button functionality
- \`cta\`: Call-to-action styling with glow/pulse options
- \`icon\`: Icon-only buttons with accessibility
- \`fab\`: Floating action button with positioning
- \`split\`: Split button with dropdown actions

## Usage Examples
\`\`\`tsx
// Basic button
<Button>Click me</Button>

// CTA button with glow
<Button behavior="cta" glow>Get Started</Button>

// Icon button
<Button behavior="icon" icon={<Heart />} label="Like" />

// Loading with custom variant
<Button loading loadingVariant="dots">Saving...</Button>

// FAB positioned bottom-right
<Button behavior="fab" fabPosition="bottom-right">+</Button>
\`\`\`
        `
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		behavior: {
			control: { type: 'select' },
			options: ['default', 'cta', 'icon', 'fab', 'split'],
			description: 'The specialized behavior type of the button'
		},
		variant: {
			control: { type: 'select' },
			options: [
				'default',
				'destructive',
				'outline',
				'secondary',
				'ghost',
				'link',
				'cta'
			],
			description: 'The visual style variant of the button'
		},
		size: {
			control: { type: 'select' },
			options: ['sm', 'default', 'lg', 'xl', 'icon'],
			description: 'The size of the button'
		},
		loading: {
			control: 'boolean',
			description: 'Whether the button is in loading state'
		},
		loadingVariant: {
			control: { type: 'select' },
			options: ['spinner', 'dots', 'shimmer'],
			description: 'The type of loading indicator to show'
		},
		animate: {
			control: 'boolean',
			description: 'Whether to enable hover animations'
		},
		success: {
			control: 'boolean',
			description: 'Whether to show success animation'
		},
		glow: {
			control: 'boolean',
			description: 'Whether to add glow effect (CTA behavior)'
		},
		pulse: {
			control: 'boolean',
			description: 'Whether to add pulse animation (CTA behavior)'
		},
		fullWidth: {
			control: 'boolean',
			description: 'Whether the button should take full width'
		}
	}
}

export default meta
type Story = StoryObj<typeof Button>

// ============================================================================
// BASIC BUTTON EXAMPLES
// ============================================================================

export const Default: Story = {
	args: {
		children: 'Button'
	}
}

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="cta">CTA</Button>
		</div>
	)
}

export const AllSizes: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-3">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="xl">Extra Large</Button>
		</div>
	)
}

// ============================================================================
// BEHAVIOR-BASED EXAMPLES
// ============================================================================

export const CTABehavior: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<Button behavior="cta">Standard CTA</Button>
				<Button behavior="cta" priority="secondary">
					Secondary CTA
				</Button>
				<Button behavior="cta" glow>
					CTA with Glow
				</Button>
				<Button behavior="cta" pulse>
					CTA with Pulse
				</Button>
				<Button behavior="cta" glow pulse>
					CTA with Both
				</Button>
			</div>

			<div className="rounded-lg bg-slate-900 p-6">
				<div className="flex flex-wrap gap-3">
					<Button behavior="cta" glow>
						Glow on Dark
					</Button>
					<Button behavior="cta" pulse priority="secondary">
						Pulse Secondary
					</Button>
				</div>
			</div>
		</div>
	)
}

export const IconBehavior: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<Button behavior="icon" icon={<Heart />} label="Like" />
				<Button
					behavior="icon"
					icon={<Share />}
					label="Share"
					variant="ghost"
				/>
				<Button
					behavior="icon"
					icon={<RefreshCw />}
					label="Refresh"
					rotateIcon
					variant="secondary"
				/>
				<Button
					behavior="icon"
					icon={<Trash2 />}
					label="Delete"
					variant="destructive"
				/>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Button behavior="icon" icon={<Plus />} label="Add" size="sm" />
				<Button
					behavior="icon"
					icon={<Edit />}
					label="Edit"
					size="default"
				/>
				<Button
					behavior="icon"
					icon={<Save />}
					label="Save"
					size="lg"
				/>
			</div>
		</div>
	)
}

export const LoadingStates: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<Button loading loadingVariant="spinner">
					Loading...
				</Button>
				<Button loading loadingVariant="dots">
					Processing
				</Button>
				<Button loading loadingVariant="shimmer">
					Saving
				</Button>
			</div>

			<div className="flex flex-wrap gap-3">
				<Button loading={false}>Not Loading</Button>
				<Button loading loadingText="Please wait...">
					Custom Text
				</Button>
				<Button loading variant="secondary" loadingVariant="dots">
					Secondary Loading
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// REAL-WORLD EXAMPLES
// ============================================================================

export const ECommerceExample: Story = {
	render: () => (
		<div className="max-w-md rounded-lg border p-6">
			<h3 className="mb-4 text-lg font-semibold">Product Actions</h3>
			<div className="space-y-3">
				<Button
					behavior="cta"
					glow
					fullWidth
					leftIcon={<ShoppingCart className="h-4 w-4" />}
				>
					Add to Cart - $299
				</Button>

				<div className="flex gap-2">
					<Button
						variant="outline"
						fullWidth
						leftIcon={<Heart className="h-4 w-4" />}
					>
						Wishlist
					</Button>
					<Button
						behavior="icon"
						icon={<Share className="h-4 w-4" />}
						label="Share Product"
						variant="ghost"
					/>
				</div>
			</div>
		</div>
	)
}
