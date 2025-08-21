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
	Share
} from 'lucide-react'

const meta: Meta<typeof Button> = {
	title: 'UI/Button',
	component: Button,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive button component system with multiple variants, states, and specialized components for different use cases.'
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
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
		behavior: {
			control: { type: 'select' },
			options: ['default', 'cta', 'icon', 'fab', 'split'],
			description: 'The specialized behavior type of the button'
		},
		fullWidth: {
			control: 'boolean',
			description: 'Whether the button should take full width'
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
		}
	}
}

export default meta
type Story = StoryObj<typeof Button>

// Basic Button Stories
export const Default: Story = {
	args: {
		children: 'Button'
	}
}

export const Primary: Story = {
	args: {
		children: 'Primary Button',
		variant: 'default'
	}
}

export const Secondary: Story = {
	args: {
		children: 'Secondary Button',
		variant: 'secondary'
	}
}

export const Destructive: Story = {
	args: {
		children: 'Destructive Button',
		variant: 'destructive'
	}
}

export const Outline: Story = {
	args: {
		children: 'Outline Button',
		variant: 'outline'
	}
}

export const Ghost: Story = {
	args: {
		children: 'Ghost Button',
		variant: 'ghost'
	}
}

export const Link: Story = {
	args: {
		children: 'Link Button',
		variant: 'link'
	}
}

export const CTA: Story = {
	args: {
		children: 'CTA Button',
		variant: 'cta'
	}
}

// Size Variants
export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="xl">Extra Large</Button>
		</div>
	)
}

// States
export const Loading: Story = {
	args: {
		children: 'Loading Button',
		loading: true,
		loadingText: 'Please wait...'
	}
}

export const Disabled: Story = {
	args: {
		children: 'Disabled Button',
		disabled: true
	}
}

export const Success: Story = {
	args: {
		children: 'Success Button',
		success: true,
		animate: true
	}
}

export const WithIcons: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex gap-4">
				<Button leftIcon={<Play className="h-4 w-4" />}>
					Play Video
				</Button>
				<Button rightIcon={<Download className="h-4 w-4" />}>
					Download
				</Button>
			</div>
			<div className="flex gap-4">
				<Button
					leftIcon={<Heart className="h-4 w-4" />}
					rightIcon={<Star className="h-4 w-4" />}
					variant="outline"
				>
					Like & Star
				</Button>
			</div>
		</div>
	)
}

export const FullWidth: Story = {
	args: {
		children: 'Full Width Button',
		fullWidth: true
	},
	parameters: {
		layout: 'padded'
	}
}

export const Animated: Story = {
	args: {
		children: 'Animated Button',
		animate: true
	}
}

// Button Group Stories
export const ButtonGroupHorizontal: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">Left</Button>
			<Button variant="outline">Center</Button>
			<Button variant="outline">Right</Button>
		</ButtonGroup>
	)
}

export const ButtonGroupVertical: Story = {
	render: () => (
		<ButtonGroup orientation="vertical">
			<Button variant="outline">Top</Button>
			<Button variant="outline">Middle</Button>
			<Button variant="outline">Bottom</Button>
		</ButtonGroup>
	)
}

export const ButtonGroupAttached: Story = {
	render: () => (
		<ButtonGroup attach>
			<Button variant="outline">Save</Button>
			<Button variant="outline">Edit</Button>
			<Button variant="outline">Delete</Button>
		</ButtonGroup>
	)
}

// Icon Button Stories
export const IconButtons: Story = {
	render: () => (
		<div className="flex gap-4">
			<IconButton
				icon={<Plus className="h-4 w-4" />}
				label="Add item"
				variant="default"
			/>
			<IconButton
				icon={<Edit className="h-4 w-4" />}
				label="Edit"
				variant="outline"
			/>
			<IconButton
				icon={<Delete className="h-4 w-4" />}
				label="Delete"
				variant="destructive"
			/>
			<IconButton
				icon={<Share className="h-4 w-4" />}
				label="Share"
				variant="ghost"
				rotate
			/>
		</div>
	)
}

// CTA Button Stories
export const CTAButtons: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex gap-4">
				<CTAButton priority="primary">Get Started</CTAButton>
				<CTAButton priority="secondary">Learn More</CTAButton>
			</div>
			<div className="flex gap-4">
				<CTAButton glow pulse>
					Special Offer
				</CTAButton>
				<CTAButton glow>Premium Feature</CTAButton>
			</div>
		</div>
	)
}

// Loading Button Stories
export const LoadingButtons: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex gap-4">
				<LoadingButton loading loadingVariant="spinner">
					Spinner Loading
				</LoadingButton>
				<LoadingButton loading loadingVariant="dots">
					Dots Loading
				</LoadingButton>
				<LoadingButton loading loadingVariant="shimmer">
					Shimmer Loading
				</LoadingButton>
			</div>
		</div>
	)
}

// Split Button Story
export const SplitButtons: Story = {
	render: () => (
		<div className="flex gap-4">
			<SplitButton
				mainAction={{
					label: 'Save',
					onClick: () => alert('Saved!')
				}}
				dropdownActions={[
					{
						label: 'Save as draft',
						onClick: () => alert('Saved as draft'),
						icon: <Save className="h-4 w-4" />
					},
					{
						label: 'Save and publish',
						onClick: () => alert('Published'),
						icon: <Share className="h-4 w-4" />
					},
					{
						label: 'Delete',
						onClick: () => alert('Deleted'),
						icon: <Delete className="h-4 w-4" />,
						destructive: true
					}
				]}
			/>
		</div>
	)
}

// Floating Action Button Story
export const FloatingActionButtons: Story = {
	render: () => (
		<div className="relative h-96 w-full rounded-lg bg-gray-50">
			<p className="p-4 text-gray-600">
				Scroll around to see floating action buttons positioned at
				different corners
			</p>

			<FloatingActionButton
				position="bottom-right"
				onClick={() => alert('Bottom Right FAB clicked!')}
			>
				<Plus className="h-6 w-6" />
			</FloatingActionButton>

			<FloatingActionButton
				position="bottom-left"
				variant="secondary"
				offset="1rem"
				onClick={() => alert('Bottom Left FAB clicked!')}
			>
				<Heart className="h-6 w-6" />
			</FloatingActionButton>
		</div>
	),
	parameters: {
		layout: 'fullscreen'
	}
}

// Kitchen Sink - All Variants Together
export const AllVariants: Story = {
	render: () => (
		<div className="space-y-6 p-6">
			<div>
				<h3 className="mb-3 text-lg font-semibold">Button Variants</h3>
				<div className="flex flex-wrap gap-3">
					<Button variant="default">Default</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="link">Link</Button>
					<Button variant="destructive">Destructive</Button>
					<Button variant="cta">CTA</Button>
				</div>
			</div>

			<div>
				<h3 className="mb-3 text-lg font-semibold">Button Sizes</h3>
				<div className="flex items-center gap-3">
					<Button size="sm">Small</Button>
					<Button size="default">Default</Button>
					<Button size="lg">Large</Button>
					<Button size="xl">Extra Large</Button>
				</div>
			</div>

			<div>
				<h3 className="mb-3 text-lg font-semibold">Button States</h3>
				<div className="flex gap-3">
					<Button>Normal</Button>
					<Button loading>Loading</Button>
					<Button disabled>Disabled</Button>
					<Button success animate>
						Success
					</Button>
				</div>
			</div>

			<div>
				<h3 className="mb-3 text-lg font-semibold">
					Specialized Buttons
				</h3>
				<div className="flex flex-wrap gap-3">
					<IconButton
						icon={<Plus className="h-4 w-4" />}
						label="Add"
					/>
					<CTAButton glow>CTA with Glow</CTAButton>
					<LoadingButton loading loadingVariant="dots">
						Loading Dots
					</LoadingButton>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: 'fullscreen'
	}
}
