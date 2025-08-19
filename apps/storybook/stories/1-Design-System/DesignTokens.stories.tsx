import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Palette,
	Type,
	Grid3x3,
	CornerDownRight,
	Layers,
	Eye,
	Smartphone,
	Monitor,
	Tablet
} from 'lucide-react'

const meta = {
	title: '🎨 Design System/Design Tokens',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Comprehensive design system tokens for TenantFlow - colors, typography, spacing, and more.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Color palette component
const ColorPalette: React.FC<{
	title: string
	colors: Array<{ name: string; value: string; description: string }>
}> = ({ title, colors }) => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Palette className="h-5 w-5" />
				{title}
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{colors.map(({ name, value, description }) => (
					<div key={name} className="text-center">
						<div
							className="mb-2 h-16 w-full rounded-lg border shadow-sm"
							style={{ backgroundColor: value }}
						/>
						<div className="text-sm font-medium">{name}</div>
						<div className="font-mono text-xs text-gray-500">
							{value}
						</div>
						<div className="mt-1 text-xs text-gray-600">
							{description}
						</div>
					</div>
				))}
			</div>
		</CardContent>
	</Card>
)

// Brand gradient showcase component
const BrandGradients: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Layers className="h-5 w-5" />
				"Simplify" Brand Gradients
			</CardTitle>
			<CardDescription>
				TenantFlow's signature gradient system for brand consistency and visual hierarchy
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* Primary Simplify Gradient */}
				<div>
					<h4 className="mb-3 font-semibold text-gray-800">Primary Brand Gradient</h4>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="text-center">
							<div className="bg-simplify mb-3 h-20 w-full rounded-lg border shadow-md" />
							<div className="text-sm font-medium">Simplify Primary</div>
							<div className="font-mono text-xs text-gray-500">bg-simplify</div>
							<div className="mt-1 text-xs text-gray-600">Hero elements, CTAs</div>
						</div>
						<div className="text-center">
							<div className="bg-simplify-soft mb-3 h-20 w-full rounded-lg border shadow-md" />
							<div className="text-sm font-medium">Simplify Soft</div>
							<div className="font-mono text-xs text-gray-500">bg-simplify-soft</div>
							<div className="mt-1 text-xs text-gray-600">Backgrounds, cards</div>
						</div>
						<div className="text-center">
							<div className="bg-simplify-radial mb-3 h-20 w-full rounded-lg border shadow-md" />
							<div className="text-sm font-medium">Simplify Radial</div>
							<div className="font-mono text-xs text-gray-500">bg-simplify-radial</div>
							<div className="mt-1 text-xs text-gray-600">Overlays, effects</div>
						</div>
					</div>
				</div>

				{/* Text Gradients */}
				<div>
					<h4 className="mb-3 font-semibold text-gray-800">Text Gradients</h4>
					<div className="space-y-4">
						<div className="rounded-lg border p-4">
							<h3 className="text-simplify mb-2 text-2xl font-bold">
								Simplify Your Property Management
							</h3>
							<p className="text-sm text-gray-600">
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
									text-simplify
								</code>
								- Primary heading gradient
							</p>
						</div>
						<div className="rounded-lg border p-4">
							<h4 className="text-gradient-subtle mb-2 text-lg font-semibold">
								Professional Property Solutions
							</h4>
							<p className="text-sm text-gray-600">
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
									text-gradient-subtle
								</code>
								- Subtle text gradient for subheadings
							</p>
						</div>
					</div>
				</div>

				{/* Interactive Gradients */}
				<div>
					<h4 className="mb-3 font-semibold text-gray-800">Interactive Elements</h4>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-3">
							<button className="shadow-simplify bg-simplify hover:glow-simplify w-full rounded-lg px-4 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02]">
								Premium CTA Button
							</button>
							<p className="text-xs text-gray-600">
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono">
									shadow-simplify hover:glow-simplify
								</code>
							</p>
						</div>
						<div className="space-y-3">
							<div className="hover-simplify cursor-pointer rounded-lg border p-3 text-center transition-all duration-300">
								Hover for gradient effect
							</div>
							<p className="text-xs text-gray-600">
								<code className="rounded bg-gray-100 px-1 py-0.5 font-mono">
									hover-simplify
								</code>
							</p>
						</div>
					</div>
				</div>

				{/* Guidelines */}
				<div className="rounded-lg bg-blue-50 p-4">
					<h4 className="mb-2 font-semibold text-blue-800">
						Brand Gradient Guidelines
					</h4>
					<ul className="space-y-1 text-sm text-blue-700">
						<li>• Use primary "Simplify" gradient for hero elements and main CTAs</li>
						<li>• Apply soft variants for subtle backgrounds and card overlays</li>
						<li>• Text gradients should be used sparingly for headlines only</li>
						<li>• All gradients maintain WCAG 2.1 AA contrast ratios</li>
						<li>• Dark mode variants automatically adjust for optimal visibility</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Typography scale component
const TypographyScale: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Type className="h-5 w-5" />
				Typography Scale
			</CardTitle>
			<CardDescription>
				Consistent type sizes and line heights based on modular scale
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-4">
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-xs
						</div>
						<div className="text-xs">
							The quick brown fox jumps over the lazy dog
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							12px / 16px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-sm
						</div>
						<div className="text-sm">
							The quick brown fox jumps over the lazy dog
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							14px / 20px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-base
						</div>
						<div className="text-base">
							The quick brown fox jumps over the lazy dog
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							16px / 24px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-lg
						</div>
						<div className="text-lg">
							The quick brown fox jumps over the lazy dog
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							18px / 28px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-xl
						</div>
						<div className="text-xl">
							The quick brown fox jumps over the lazy dog
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							20px / 28px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-2xl
						</div>
						<div className="text-2xl font-semibold">
							The quick brown fox
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							24px / 32px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-3xl
						</div>
						<div className="text-3xl font-bold">
							The quick brown
						</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							30px / 36px
						</div>
					</div>
					<div className="flex items-baseline gap-4 rounded-lg border p-4">
						<div className="w-20 text-xs text-gray-500">
							text-4xl
						</div>
						<div className="text-4xl font-bold">TenantFlow</div>
						<div className="ml-auto font-mono text-xs text-gray-400">
							36px / 40px
						</div>
					</div>
				</div>

				<div className="mt-6 rounded-lg bg-blue-50 p-4">
					<h4 className="mb-2 font-semibold text-blue-800">
						Typography Guidelines
					</h4>
					<ul className="space-y-1 text-sm text-blue-700">
						<li>• Use font-normal (400) for body text</li>
						<li>
							• Use font-medium (500) for labels and secondary
							headings
						</li>
						<li>• Use font-semibold (600) for primary headings</li>
						<li>
							• Use font-bold (700) for emphasis and hero text
						</li>
						<li>• Maintain 1.5x line height for readability</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Spacing system component
const SpacingSystem: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Grid3x3 className="h-5 w-5" />
				Spacing System
			</CardTitle>
			<CardDescription>
				8px grid system for consistent spacing and alignment
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-4">
				{[
					{
						name: 'xs',
						value: '0.5',
						px: '2px',
						description: 'Micro spacing'
					},
					{
						name: 'sm',
						value: '1',
						px: '4px',
						description: 'Fine adjustments'
					},
					{
						name: 'base',
						value: '2',
						px: '8px',
						description: 'Base unit'
					},
					{
						name: 'md',
						value: '3',
						px: '12px',
						description: 'Small gaps'
					},
					{
						name: 'lg',
						value: '4',
						px: '16px',
						description: 'Standard spacing'
					},
					{
						name: 'xl',
						value: '6',
						px: '24px',
						description: 'Section spacing'
					},
					{
						name: '2xl',
						value: '8',
						px: '32px',
						description: 'Component spacing'
					},
					{
						name: '3xl',
						value: '12',
						px: '48px',
						description: 'Layout spacing'
					},
					{
						name: '4xl',
						value: '16',
						px: '64px',
						description: 'Section breaks'
					},
					{
						name: '5xl',
						value: '20',
						px: '80px',
						description: 'Page sections'
					}
				].map(({ name, value, px, description }) => (
					<div
						key={name}
						className="flex items-center gap-4 rounded-lg border p-3"
					>
						<div className="w-16 font-mono text-sm">{name}</div>
						<div className="w-12 font-mono text-sm text-gray-500">
							{value}
						</div>
						<div className="w-16 font-mono text-sm text-blue-600">
							{px}
						</div>
						<div
							className="h-4 rounded bg-blue-500"
							style={{ width: px }}
						/>
						<div className="flex-1 text-sm text-gray-600">
							{description}
						</div>
					</div>
				))}
			</div>

			<div className="mt-6 rounded-lg bg-green-50 p-4">
				<h4 className="mb-2 font-semibold text-green-800">
					Spacing Best Practices
				</h4>
				<ul className="space-y-1 text-sm text-green-700">
					<li>• Always use multiples of 8px (0.5rem increments)</li>
					<li>• Use consistent spacing within similar components</li>
					<li>• Increase spacing to create visual hierarchy</li>
					<li>• Use smaller spacing for related elements</li>
					<li>• Test spacing on mobile devices (touch targets)</li>
				</ul>
			</div>
		</CardContent>
	</Card>
)

// Border radius component
const BorderRadiusScale: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<CornerDownRight className="h-5 w-5" />
				Border Radius
			</CardTitle>
			<CardDescription>
				Consistent corner radius for modern interface design
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{[
					{ name: 'none', value: '0', class: 'rounded-none' },
					{ name: 'sm', value: '2px', class: 'rounded-sm' },
					{ name: 'base', value: '4px', class: 'rounded' },
					{ name: 'md', value: '6px', class: 'rounded-md' },
					{ name: 'lg', value: '8px', class: 'rounded-lg' },
					{ name: 'xl', value: '12px', class: 'rounded-xl' },
					{ name: '2xl', value: '16px', class: 'rounded-2xl' },
					{ name: 'full', value: '9999px', class: 'rounded-full' }
				].map(({ name, value, class: className }) => (
					<div key={name} className="text-center">
						<div
							className={`mx-auto mb-2 h-16 w-16 bg-blue-500 ${className}`}
						/>
						<div className="text-sm font-medium">{name}</div>
						<div className="text-xs text-gray-500">{value}</div>
						<div className="font-mono text-xs text-gray-400">
							{className}
						</div>
					</div>
				))}
			</div>
		</CardContent>
	</Card>
)

// Elevation/Shadow system
const ElevationSystem: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Layers className="h-5 w-5" />
				Elevation System
			</CardTitle>
			<CardDescription>
				Layered shadows for depth and hierarchy
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="grid grid-cols-2 gap-6 md:grid-cols-3">
				{[
					{
						name: 'sm',
						description: 'Subtle elevation',
						class: 'shadow-sm'
					},
					{
						name: 'base',
						description: 'Default cards',
						class: 'shadow'
					},
					{
						name: 'md',
						description: 'Hover states',
						class: 'shadow-md'
					},
					{
						name: 'lg',
						description: 'Modals, dropdowns',
						class: 'shadow-lg'
					},
					{
						name: 'xl',
						description: 'Major overlays',
						class: 'shadow-xl'
					},
					{
						name: '2xl',
						description: 'Hero elements',
						class: 'shadow-2xl'
					}
				].map(({ name, description, class: className }) => (
					<div key={name} className="text-center">
						<div
							className={`mx-auto mb-3 h-20 w-20 rounded-lg bg-white ${className} border`}
						/>
						<div className="text-sm font-medium">{name}</div>
						<div className="text-xs text-gray-600">
							{description}
						</div>
						<div className="font-mono text-xs text-gray-400">
							{className}
						</div>
					</div>
				))}
			</div>
		</CardContent>
	</Card>
)

// Responsive breakpoints
const ResponsiveBreakpoints: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Eye className="h-5 w-5" />
				Responsive Breakpoints
			</CardTitle>
			<CardDescription>
				Mobile-first responsive design breakpoints
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-4">
				{[
					{
						name: 'sm',
						width: '640px',
						description: 'Small devices',
						icon: Smartphone
					},
					{
						name: 'md',
						width: '768px',
						description: 'Medium devices',
						icon: Tablet
					},
					{
						name: 'lg',
						width: '1024px',
						description: 'Large devices',
						icon: Monitor
					},
					{
						name: 'xl',
						width: '1280px',
						description: 'Extra large',
						icon: Monitor
					},
					{
						name: '2xl',
						width: '1536px',
						description: 'Ultra wide',
						icon: Monitor
					}
				].map(({ name, width, description, icon: Icon }) => (
					<div
						key={name}
						className="flex items-center gap-4 rounded-lg border p-4"
					>
						<Icon className="h-6 w-6 text-blue-600" />
						<div className="flex-1">
							<div className="font-medium">
								{name}: {width}+
							</div>
							<div className="text-sm text-gray-600">
								{description}
							</div>
						</div>
						<Badge variant="outline" className="font-mono text-xs">
							{width}
						</Badge>
					</div>
				))}
			</div>

			<div className="mt-6 rounded-lg bg-purple-50 p-4">
				<h4 className="mb-2 font-semibold text-purple-800">
					Responsive Guidelines
				</h4>
				<ul className="space-y-1 text-sm text-purple-700">
					<li>• Design mobile-first, progressively enhance</li>
					<li>• Test on actual devices, not just browser resize</li>
					<li>• Consider touch targets (44px minimum)</li>
					<li>• Optimize content hierarchy for small screens</li>
					<li>
						• Use appropriate breakpoints for content, not devices
					</li>
				</ul>
			</div>
		</CardContent>
	</Card>
)

export const ColorSystem: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-4xl font-bold">Design Tokens</h1>
				<p className="text-xl text-gray-600">
					Foundational elements of the TenantFlow design system
				</p>
			</div>

			{/* Brand Gradients Section */}
			<BrandGradients />

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<ColorPalette
					title="Brand Colors (OKLCH)"
					colors={[
						{
							name: 'Brand 50',
							value: 'oklch(0.97 0.02 235)',
							description: 'Light backgrounds'
						},
						{
							name: 'Brand 500',
							value: 'oklch(0.52 0.18 235)',
							description: 'Primary brand'
						},
						{
							name: 'Brand 600',
							value: 'oklch(0.44 0.16 235)',
							description: 'Primary hover'
						},
						{
							name: 'Brand 900',
							value: 'oklch(0.2 0.08 235)',
							description: 'High contrast'
						}
					]}
				/>

				<ColorPalette
					title="Semantic Colors (OKLCH)"
					colors={[
						{
							name: 'Success',
							value: 'oklch(0.55 0.12 142)',
							description: 'Success states'
						},
						{
							name: 'Error',
							value: 'oklch(0.58 0.15 27)',
							description: 'Error states'
						},
						{
							name: 'Warning',
							value: 'oklch(0.75 0.14 85)',
							description: 'Warning states'
						},
						{
							name: 'Info',
							value: 'oklch(0.6 0.12 240)',
							description: 'Information'
						}
					]}
				/>
			</div>

			<ColorPalette
				title="Neutral Scale (OKLCH)"
				colors={[
					{
						name: 'Neutral 50',
						value: 'oklch(0.99 0.002 240)',
						description: 'Pure backgrounds'
					},
					{
						name: 'Neutral 100',
						value: 'oklch(0.97 0.003 240)',
						description: 'Subtle backgrounds'
					},
					{
						name: 'Neutral 200',
						value: 'oklch(0.94 0.004 240)',
						description: 'Borders'
					},
					{
						name: 'Neutral 300',
						value: 'oklch(0.89 0.005 240)',
						description: 'Input borders'
					},
					{
						name: 'Neutral 400',
						value: 'oklch(0.63 0.006 240)',
						description: 'Placeholder text'
					},
					{
						name: 'Neutral 500',
						value: 'oklch(0.52 0.007 240)',
						description: 'Secondary text'
					},
					{
						name: 'Neutral 600',
						value: 'oklch(0.42 0.008 240)',
						description: 'Primary text'
					},
					{
						name: 'Neutral 700',
						value: 'oklch(0.32 0.009 240)',
						description: 'Headings'
					},
					{
						name: 'Neutral 800',
						value: 'oklch(0.22 0.01 240)',
						description: 'High contrast'
					},
					{
						name: 'Neutral 900',
						value: 'oklch(0.15 0.011 240)',
						description: 'Maximum contrast'
					}
				]}
			/>

			{/* WCAG Compliance Notice */}
			<div className="rounded-lg bg-green-50 p-6 border border-green-200">
				<h3 className="mb-3 font-semibold text-green-800 flex items-center gap-2">
					<span className="text-green-600">✓</span>
					WCAG 2.1 AA Compliance
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
					<div>
						<h4 className="font-medium mb-2">Color Accessibility</h4>
						<ul className="space-y-1">
							<li>• All text colors meet 4.5:1 contrast ratio minimum</li>
							<li>• Large text meets 3:1 contrast ratio minimum</li>
							<li>• Brand gradients maintain readability standards</li>
						</ul>
					</div>
					<div>
						<h4 className="font-medium mb-2">Modern Color Science</h4>
						<ul className="space-y-1">
							<li>• OKLCH color space for perceptual uniformity</li>
							<li>• Consistent lightness across hue variations</li>
							<li>• Future-proof for wide gamut displays</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}

export const Typography: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-4xl font-bold">Typography System</h1>
				<p className="text-xl text-gray-600">
					Harmonious type scale for readable interfaces
				</p>
			</div>

			<TypographyScale />

			<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Font Weights</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="font-normal">
								font-normal (400) - Body text
							</div>
							<div className="font-medium">
								font-medium (500) - Labels
							</div>
							<div className="font-semibold">
								font-semibold (600) - Headings
							</div>
							<div className="font-bold">
								font-bold (700) - Emphasis
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Text Colors</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="text-gray-900">
								Primary text (gray-900)
							</div>
							<div className="text-gray-600">
								Secondary text (gray-600)
							</div>
							<div className="text-gray-400">
								Disabled text (gray-400)
							</div>
							<div className="text-blue-600">
								Link text (blue-600)
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export const SpacingAndLayout: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-4xl font-bold">Spacing & Layout</h1>
				<p className="text-xl text-gray-600">
					Consistent spacing system based on 8px grid
				</p>
			</div>

			<SpacingSystem />

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<BorderRadiusScale />
				<ElevationSystem />
			</div>

			<ResponsiveBreakpoints />
		</div>
	)
}

export const ComponentTokens: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-4xl font-bold">Component Tokens</h1>
				<p className="text-xl text-gray-600">
					Semantic tokens applied to common UI components
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Button Tokens</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button size="sm">Small Button</Button>
						<Button>Default Button</Button>
						<Button size="lg">Large Button</Button>
						<div className="mt-4 text-xs text-gray-600">
							Heights: 32px, 40px, 48px
							<br />
							Padding: 12px-16px horizontal
							<br />
							Border radius: 6px
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Card Tokens</CardTitle>
					</CardHeader>
					<CardContent>
						<Card className="p-4 text-center">
							<div>Sample Card</div>
						</Card>
						<div className="mt-4 text-xs text-gray-600">
							Background: white
							<br />
							Border: gray-200
							<br />
							Shadow: sm
							<br />
							Border radius: 8px
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Input Tokens</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<input
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							placeholder="Sample input"
						/>
						<div className="text-xs text-gray-600">
							Height: 40px
							<br />
							Padding: 8px 12px
							<br />
							Border: gray-300
							<br />
							Focus: blue-500 ring
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Usage Guidelines</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<h4 className="mb-2 font-semibold text-green-800">
								✅ Do
							</h4>
							<ul className="space-y-1 text-sm">
								<li>
									• Use semantic tokens (primary, secondary)
								</li>
								<li>• Maintain consistent spacing ratios</li>
								<li>• Apply elevation purposefully</li>
								<li>• Test color contrast ratios</li>
								<li>• Use design tokens in code</li>
							</ul>
						</div>
						<div>
							<h4 className="mb-2 font-semibold text-red-800">
								❌ Don't
							</h4>
							<ul className="space-y-1 text-sm">
								<li>• Use arbitrary spacing values</li>
								<li>• Mix different border radius scales</li>
								<li>• Overuse high elevation shadows</li>
								<li>• Ignore responsive breakpoints</li>
								<li>• Hard-code color values</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
