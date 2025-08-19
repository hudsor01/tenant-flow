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
	Shield,
	Eye,
	Palette,
	CheckCircle,
	XCircle,
	Users,
	Monitor,
	Smartphone,
	Tablet
} from 'lucide-react'

const meta = {
	title: '🎨 Design System/Brand Guidelines',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Comprehensive brand guidelines for TenantFlow\'s "Simplify" design system, including accessibility standards and usage patterns.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Brand Identity component
const BrandIdentity: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Palette className="h-5 w-5" />
				TenantFlow Brand Identity
			</CardTitle>
			<CardDescription>
				The "Simplify" brand system - making property management effortless
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* Brand Promise */}
				<div className="text-center py-8 px-6 bg-hero rounded-lg border">
					<h1 className="text-simplify text-4xl font-bold mb-4">
						Simplify Property Management
					</h1>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						Our brand represents clarity, efficiency, and trust. The "Simplify" gradient 
						embodies the transformation from complexity to simplicity.
					</p>
				</div>

				{/* Brand Values */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="text-center p-4 rounded-lg border">
						<div className="w-12 h-12 bg-simplify rounded-full mx-auto mb-3 flex items-center justify-center">
							<Shield className="h-6 w-6 text-white" />
						</div>
						<h3 className="font-semibold mb-2">Trustworthy</h3>
						<p className="text-sm text-gray-600">
							Professional, reliable, secure solutions that property managers can depend on.
						</p>
					</div>
					<div className="text-center p-4 rounded-lg border">
						<div className="w-12 h-12 bg-simplify rounded-full mx-auto mb-3 flex items-center justify-center">
							<Eye className="h-6 w-6 text-white" />
						</div>
						<h3 className="font-semibold mb-2">Clear</h3>
						<p className="text-sm text-gray-600">
							Intuitive interfaces that make complex tasks feel simple and straightforward.
						</p>
					</div>
					<div className="text-center p-4 rounded-lg border">
						<div className="w-12 h-12 bg-simplify rounded-full mx-auto mb-3 flex items-center justify-center">
							<Users className="h-6 w-6 text-white" />
						</div>
						<h3 className="font-semibold mb-2">Empowering</h3>
						<p className="text-sm text-gray-600">
							Tools that enable property managers to do more with less effort and stress.
						</p>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Usage Guidelines component
const UsageGuidelines: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<CheckCircle className="h-5 w-5" />
				Brand Usage Guidelines
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Do's */}
				<div>
					<h3 className="mb-4 font-semibold text-green-800 flex items-center gap-2">
						<CheckCircle className="h-5 w-5 text-green-600" />
						Best Practices
					</h3>
					<div className="space-y-4">
						<div className="p-4 bg-green-50 rounded-lg border border-green-200">
							<Button variant="simplify" className="mb-3">
								Start Free Trial
							</Button>
							<p className="text-sm text-green-700">
								<strong>Primary CTA:</strong> Use "simplify" variant for main calls-to-action. 
								Limit to 1-2 per page for maximum impact.
							</p>
						</div>
						<div className="p-4 bg-green-50 rounded-lg border border-green-200">
							<h4 className="text-simplify text-xl font-semibold mb-2">
								Feature Headlines
							</h4>
							<p className="text-sm text-green-700">
								<strong>Text gradients:</strong> Apply to primary headlines and hero text 
								to reinforce brand identity and create visual hierarchy.
							</p>
						</div>
						<div className="p-4 bg-green-50 rounded-lg border border-green-200">
							<div className="bg-simplify-soft p-3 rounded border">
								<p className="text-sm font-medium">Subtle brand touch</p>
							</div>
							<p className="text-sm text-green-700 mt-2">
								<strong>Soft gradients:</strong> Use for card backgrounds and subtle 
								brand reinforcement without overwhelming content.
							</p>
						</div>
					</div>
				</div>

				{/* Don'ts */}
				<div>
					<h3 className="mb-4 font-semibold text-red-800 flex items-center gap-2">
						<XCircle className="h-5 w-5 text-red-600" />
						Avoid These Patterns
					</h3>
					<div className="space-y-4">
						<div className="p-4 bg-red-50 rounded-lg border border-red-200">
							<div className="flex gap-2 mb-3">
								<Button variant="simplify" size="sm">CTA 1</Button>
								<Button variant="simplify" size="sm">CTA 2</Button>
								<Button variant="simplify" size="sm">CTA 3</Button>
							</div>
							<p className="text-sm text-red-700">
								<strong>Too many primary CTAs:</strong> Multiple brand CTAs compete 
								for attention and dilute the primary action.
							</p>
						</div>
						<div className="p-4 bg-red-50 rounded-lg border border-red-200">
							<div className="text-simplify mb-2">
								<p className="text-sm">Body text with gradient</p>
								<p className="text-xs">Small text with gradient</p>
							</div>
							<p className="text-sm text-red-700">
								<strong>Overuse of text gradients:</strong> Body text and small text 
								should never use gradients - reduces readability.
							</p>
						</div>
						<div className="p-4 bg-red-50 rounded-lg border border-red-200">
							<Button 
								variant="outline" 
								className="mb-2" 
								style={{ 
									background: 'linear-gradient(45deg, red, blue, green)',
									color: 'white'
								}}
							>
								Custom Gradient
							</Button>
							<p className="text-sm text-red-700">
								<strong>Custom gradients:</strong> Stick to the defined "Simplify" 
								gradient system for brand consistency.
							</p>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Accessibility Guidelines component
const AccessibilityGuidelines: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Shield className="h-5 w-5" />
				Accessibility Standards
			</CardTitle>
			<CardDescription>
				WCAG 2.1 AA compliance and inclusive design principles
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* Contrast Standards */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Color Contrast Standards</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 border rounded-lg">
							<div className="flex items-center justify-between mb-3">
								<Button variant="simplify">Primary CTA</Button>
								<Badge variant="default" className="bg-green-100 text-green-800">
									AAA
								</Badge>
							</div>
							<p className="text-sm text-gray-600">
								Brand buttons maintain 7:1 contrast ratio, exceeding AAA standards for maximum accessibility.
							</p>
						</div>
						<div className="p-4 border rounded-lg">
							<div className="flex items-center justify-between mb-3">
								<span className="text-simplify text-lg font-semibold">
									Gradient Text
								</span>
								<Badge variant="default" className="bg-green-100 text-green-800">
									AA
								</Badge>
							</div>
							<p className="text-sm text-gray-600">
								Text gradients are designed to maintain 4.5:1 contrast minimum against backgrounds.
							</p>
						</div>
					</div>
				</div>

				{/* Focus States */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Focus & Interactive States</h3>
					<div className="space-y-4">
						<div className="p-4 border rounded-lg">
							<div className="flex gap-4 mb-3">
								<Button variant="outline" className="focus-simplify">
									Click to focus
								</Button>
								<Button variant="ghost" className="focus-simplify">
									Ghost with focus
								</Button>
							</div>
							<p className="text-sm text-gray-600">
								All interactive elements include visible focus indicators with 
								brand-consistent focus rings for keyboard navigation.
							</p>
						</div>
					</div>
				</div>

				{/* Responsive Design */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Responsive Accessibility</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 border rounded-lg">
							<Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
							<h4 className="font-medium mb-1">Mobile (320px+)</h4>
							<p className="text-xs text-gray-600">
								44px minimum touch targets, readable text sizes
							</p>
						</div>
						<div className="text-center p-4 border rounded-lg">
							<Tablet className="h-8 w-8 mx-auto mb-2 text-blue-600" />
							<h4 className="font-medium mb-1">Tablet (768px+)</h4>
							<p className="text-xs text-gray-600">
								Optimized for both touch and pointer interactions
							</p>
						</div>
						<div className="text-center p-4 border rounded-lg">
							<Monitor className="h-8 w-8 mx-auto mb-2 text-blue-600" />
							<h4 className="font-medium mb-1">Desktop (1024px+)</h4>
							<p className="text-xs text-gray-600">
								Full keyboard navigation, enhanced hover states
							</p>
						</div>
					</div>
				</div>

				{/* Accessibility Checklist */}
				<div className="bg-green-50 p-6 rounded-lg border border-green-200">
					<h3 className="mb-4 font-semibold text-green-800">
						Accessibility Compliance Checklist
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
						<div>
							<ul className="space-y-2">
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									WCAG 2.1 AA color contrast (4.5:1 minimum)
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Keyboard navigation support
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Screen reader compatibility
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Focus indicators on all interactive elements
								</li>
							</ul>
						</div>
						<div>
							<ul className="space-y-2">
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									44px minimum touch targets on mobile
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Reduced motion respect
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Semantic HTML structure
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									ARIA labels and descriptions
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

export const BrandOverview: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="text-center mb-8">
				<h1 className="mb-4 text-4xl font-bold">TenantFlow Brand Guidelines</h1>
				<p className="text-xl text-gray-600 max-w-3xl mx-auto">
					Comprehensive guidelines for implementing the "Simplify" brand system with 
					accessibility and consistency at its core.
				</p>
			</div>

			<BrandIdentity />
			<UsageGuidelines />
			<AccessibilityGuidelines />

			{/* Implementation Resources */}
			<Card>
				<CardHeader>
					<CardTitle>Implementation Resources</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="p-4 border rounded-lg text-center">
							<h4 className="font-semibold mb-2">Design Tokens</h4>
							<p className="text-sm text-gray-600 mb-3">
								CSS custom properties and Tailwind classes for consistent implementation.
							</p>
							<Button variant="outline" size="sm">
								View Tokens
							</Button>
						</div>
						<div className="p-4 border rounded-lg text-center">
							<h4 className="font-semibold mb-2">Component Library</h4>
							<p className="text-sm text-gray-600 mb-3">
								Pre-built React components with brand consistency built-in.
							</p>
							<Button variant="outline" size="sm">
								View Components
							</Button>
						</div>
						<div className="p-4 border rounded-lg text-center">
							<h4 className="font-semibold mb-2">Code Examples</h4>
							<p className="text-sm text-gray-600 mb-3">
								Copy-paste examples for common patterns and implementations.
							</p>
							<Button variant="outline" size="sm">
								View Examples
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}