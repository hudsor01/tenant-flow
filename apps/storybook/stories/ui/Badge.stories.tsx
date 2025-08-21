import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '@/components/ui/badge'
import {
	Check,
	X,
	Star,
	Crown,
	Shield,
	Zap,
	Heart,
	Sparkles,
	TrendingUp,
	AlertCircle,
	User,
	Calendar
} from 'lucide-react'

const meta: Meta<typeof Badge> = {
	title: 'UI/Badge',
	component: Badge,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A versatile badge component for displaying status, categories, or additional information. Supports multiple variants and can include icons.'
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'secondary', 'destructive', 'outline'],
			description: 'The visual style variant of the badge'
		},
		asChild: {
			control: 'boolean',
			description: 'Whether to render as a child component'
		}
	}
}

export default meta
type Story = StoryObj<typeof Badge>

// Basic Badge Stories
export const Default: Story = {
	args: {
		children: 'Default Badge'
	}
}

export const Secondary: Story = {
	args: {
		children: 'Secondary Badge',
		variant: 'secondary'
	}
}

export const Destructive: Story = {
	args: {
		children: 'Destructive Badge',
		variant: 'destructive'
	}
}

export const Outline: Story = {
	args: {
		children: 'Outline Badge',
		variant: 'outline'
	}
}

// Badge Variants Demo
export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	)
}

// Badges with Icons
export const WithIcons: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Badge>
				<Check className="mr-1" />
				Verified
			</Badge>
			<Badge variant="secondary">
				<Star className="mr-1" />
				Premium
			</Badge>
			<Badge variant="destructive">
				<X className="mr-1" />
				Error
			</Badge>
			<Badge variant="outline">
				<Crown className="mr-1" />
				VIP
			</Badge>
		</div>
	)
}

// Status Badges
export const StatusBadges: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h4 className="mb-2 text-sm font-medium">Order Status</h4>
				<div className="flex gap-2">
					<Badge variant="outline">Pending</Badge>
					<Badge variant="secondary">Processing</Badge>
					<Badge>
						<Check className="mr-1" />
						Completed
					</Badge>
					<Badge variant="destructive">
						<X className="mr-1" />
						Cancelled
					</Badge>
				</div>
			</div>

			<div>
				<h4 className="mb-2 text-sm font-medium">User Status</h4>
				<div className="flex gap-2">
					<Badge>
						<div className="mr-1 h-2 w-2 rounded-full bg-green-500" />
						Online
					</Badge>
					<Badge variant="secondary">
						<div className="mr-1 h-2 w-2 rounded-full bg-yellow-500" />
						Away
					</Badge>
					<Badge variant="outline">
						<div className="mr-1 h-2 w-2 rounded-full bg-gray-500" />
						Offline
					</Badge>
				</div>
			</div>
		</div>
	)
}

// Category Badges
export const CategoryBadges: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h4 className="mb-2 text-sm font-medium">Technology Stack</h4>
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline">React</Badge>
					<Badge variant="outline">TypeScript</Badge>
					<Badge variant="outline">Next.js</Badge>
					<Badge variant="outline">Tailwind CSS</Badge>
					<Badge variant="outline">Storybook</Badge>
				</div>
			</div>

			<div>
				<h4 className="mb-2 text-sm font-medium">Skills</h4>
				<div className="flex flex-wrap gap-2">
					<Badge>Frontend</Badge>
					<Badge>Backend</Badge>
					<Badge variant="secondary">UI/UX</Badge>
					<Badge variant="secondary">DevOps</Badge>
				</div>
			</div>
		</div>
	)
}

// Notification Badges
export const NotificationBadges: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<div className="relative">
					<button className="flex items-center gap-2 rounded-lg border p-3">
						<User className="h-5 w-5" />
						Profile
					</button>
					<Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px]">
						3
					</Badge>
				</div>

				<div className="relative">
					<button className="flex items-center gap-2 rounded-lg border p-3">
						<Calendar className="h-5 w-5" />
						Events
					</button>
					<Badge
						variant="destructive"
						className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px]"
					>
						12
					</Badge>
				</div>
			</div>
		</div>
	)
}

// Pricing Badges
export const PricingBadges: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div className="relative rounded-lg border p-6">
				<h3 className="text-lg font-semibold">Basic</h3>
				<p className="text-2xl font-bold">$9</p>
				<p className="text-muted-foreground">per month</p>
			</div>

			<div className="border-primary relative rounded-lg border-2 p-6">
				<Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
					<Crown className="mr-1" />
					Most Popular
				</Badge>
				<h3 className="text-lg font-semibold">Pro</h3>
				<p className="text-2xl font-bold">$29</p>
				<p className="text-muted-foreground">per month</p>
			</div>

			<div className="relative rounded-lg border p-6">
				<Badge
					variant="secondary"
					className="absolute -top-3 left-1/2 -translate-x-1/2"
				>
					<Sparkles className="mr-1" />
					Enterprise
				</Badge>
				<h3 className="text-lg font-semibold">Enterprise</h3>
				<p className="text-2xl font-bold">$99</p>
				<p className="text-muted-foreground">per month</p>
			</div>
		</div>
	),
	parameters: {
		layout: 'padded'
	}
}

// Interactive Badges
export const InteractiveBadges: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h4 className="mb-2 text-sm font-medium">Clickable Badges</h4>
				<div className="flex gap-2">
					<Badge asChild>
						<button onClick={() => alert('Badge clicked!')}>
							<Zap className="mr-1" />
							Clickable
						</button>
					</Badge>
					<Badge variant="secondary" asChild>
						<a href="#" className="no-underline">
							<Heart className="mr-1" />
							Link Badge
						</a>
					</Badge>
				</div>
			</div>
		</div>
	)
}

// Size Variations (using custom classes)
export const SizeVariations: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h4 className="mb-2 text-sm font-medium">Different Sizes</h4>
				<div className="flex items-center gap-3">
					<Badge className="px-1 py-0 text-[10px]">Tiny</Badge>
					<Badge className="text-xs">Small</Badge>
					<Badge>Default</Badge>
					<Badge className="px-3 py-1 text-sm">Large</Badge>
					<Badge className="px-4 py-1.5 text-base">Extra Large</Badge>
				</div>
			</div>
		</div>
	)
}

// Custom Color Badges
export const CustomColors: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h4 className="mb-2 text-sm font-medium">Custom Colors</h4>
				<div className="flex flex-wrap gap-2">
					<Badge className="bg-blue-500 text-white hover:bg-blue-600">
						Blue
					</Badge>
					<Badge className="bg-green-500 text-white hover:bg-green-600">
						Green
					</Badge>
					<Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
						Yellow
					</Badge>
					<Badge className="bg-purple-500 text-white hover:bg-purple-600">
						Purple
					</Badge>
					<Badge className="bg-pink-500 text-white hover:bg-pink-600">
						Pink
					</Badge>
					<Badge className="bg-orange-500 text-white hover:bg-orange-600">
						Orange
					</Badge>
				</div>
			</div>

			<div>
				<h4 className="mb-2 text-sm font-medium">Priority Levels</h4>
				<div className="flex gap-2">
					<Badge className="border-red-200 bg-red-100 text-red-800">
						<AlertCircle className="mr-1" />
						High Priority
					</Badge>
					<Badge className="border-yellow-200 bg-yellow-100 text-yellow-800">
						Medium Priority
					</Badge>
					<Badge className="border-green-200 bg-green-100 text-green-800">
						Low Priority
					</Badge>
				</div>
			</div>
		</div>
	)
}

// Real-world Usage Examples
export const RealWorldExamples: Story = {
	render: () => (
		<div className="space-y-6">
			{/* Article Card with Tags */}
			<div className="rounded-lg border p-4">
				<h3 className="mb-2 text-lg font-semibold">
					Building Modern Web Applications
				</h3>
				<p className="text-muted-foreground mb-3">
					A comprehensive guide to modern web development practices
					and tools.
				</p>
				<div className="mb-3 flex flex-wrap gap-2">
					<Badge variant="outline">React</Badge>
					<Badge variant="outline">TypeScript</Badge>
					<Badge variant="outline">Web Development</Badge>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Badge variant="secondary">
							<TrendingUp className="mr-1" />
							Popular
						</Badge>
						<Badge>
							<div className="mr-1 h-2 w-2 rounded-full bg-green-500" />
							Published
						</Badge>
					</div>
					<span className="text-muted-foreground text-sm">
						5 min read
					</span>
				</div>
			</div>

			{/* User Profile with Status */}
			<div className="rounded-lg border p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
						<div>
							<h4 className="font-semibold">Sarah Johnson</h4>
							<p className="text-muted-foreground text-sm">
								Product Designer
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Badge>
							<Shield className="mr-1" />
							Verified
						</Badge>
						<Badge variant="secondary">
							<div className="mr-1 h-2 w-2 rounded-full bg-green-500" />
							Online
						</Badge>
					</div>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: 'padded'
	}
}

// Kitchen Sink - All Badge Types
export const AllBadgeTypes: Story = {
	render: () => (
		<div className="space-y-6 p-6">
			<div>
				<h3 className="mb-4 text-lg font-semibold">Badge Variants</h3>
				<div className="flex flex-wrap gap-3">
					<Badge>Default</Badge>
					<Badge variant="secondary">Secondary</Badge>
					<Badge variant="destructive">Destructive</Badge>
					<Badge variant="outline">Outline</Badge>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">With Icons</h3>
				<div className="flex flex-wrap gap-3">
					<Badge>
						<Check className="mr-1" />
						Success
					</Badge>
					<Badge variant="secondary">
						<Star className="mr-1" />
						Featured
					</Badge>
					<Badge variant="destructive">
						<X className="mr-1" />
						Error
					</Badge>
					<Badge variant="outline">
						<Crown className="mr-1" />
						Premium
					</Badge>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">
					Status Indicators
				</h3>
				<div className="flex flex-wrap gap-3">
					<Badge>
						<div className="mr-1 h-2 w-2 rounded-full bg-green-500" />
						Active
					</Badge>
					<Badge variant="secondary">
						<div className="mr-1 h-2 w-2 rounded-full bg-yellow-500" />
						Pending
					</Badge>
					<Badge variant="outline">
						<div className="mr-1 h-2 w-2 rounded-full bg-gray-500" />
						Inactive
					</Badge>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">
					Notification Badges
				</h3>
				<div className="flex items-center gap-4">
					<div className="relative">
						<div className="rounded border p-2">Messages</div>
						<Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px]">
							3
						</Badge>
					</div>
					<div className="relative">
						<div className="rounded border p-2">Alerts</div>
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px]"
						>
							!
						</Badge>
					</div>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: 'fullscreen'
	}
}
