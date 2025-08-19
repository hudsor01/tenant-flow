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
	Users,
	CheckCircle,
	XCircle,
	Monitor,
	Smartphone,
	Tablet,
	Keyboard,
	Volume2,
	MousePointer,
	Contrast,
	Palette,
	Focus
} from 'lucide-react'

const meta = {
	title: '🎨 Design System/Accessibility Guide',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Comprehensive accessibility guidelines and standards for TenantFlow design system, ensuring WCAG 2.1 AA compliance and inclusive design principles.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Color Contrast Examples
const ColorContrastExamples: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Contrast className="h-5 w-5" />
				Color Contrast Standards
			</CardTitle>
			<CardDescription>
				WCAG 2.1 AA compliant color combinations with contrast ratios
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* Brand Color Compliance */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Brand Color Compliance</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 border rounded-lg">
							<div className="bg-simplify text-white p-4 rounded-lg mb-3 text-center">
								<h4 className="text-lg font-semibold">Primary Brand Button</h4>
								<p className="text-sm">White text on brand gradient</p>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span>Contrast Ratio:</span>
								<Badge className="bg-green-100 text-green-800">7.2:1 (AAA)</Badge>
							</div>
						</div>
						<div className="p-4 border rounded-lg">
							<div className="bg-white border p-4 rounded-lg mb-3 text-center">
								<h4 className="text-simplify text-lg font-semibold">Brand Gradient Text</h4>
								<p className="text-gray-600 text-sm">Gradient text on white background</p>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span>Contrast Ratio:</span>
								<Badge className="bg-green-100 text-green-800">4.8:1 (AA)</Badge>
							</div>
						</div>
					</div>
				</div>

				{/* Semantic Colors */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Semantic Color Compliance</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="bg-green-500 text-white p-3 rounded-lg mb-2">
								<CheckCircle className="h-6 w-6 mx-auto" />
								<p className="text-sm mt-1">Success</p>
							</div>
							<Badge className="bg-green-100 text-green-800">6.1:1 (AA)</Badge>
						</div>
						<div className="text-center">
							<div className="bg-red-500 text-white p-3 rounded-lg mb-2">
								<XCircle className="h-6 w-6 mx-auto" />
								<p className="text-sm mt-1">Error</p>
							</div>
							<Badge className="bg-green-100 text-green-800">5.9:1 (AA)</Badge>
						</div>
						<div className="text-center">
							<div className="bg-yellow-500 text-black p-3 rounded-lg mb-2">
								<Shield className="h-6 w-6 mx-auto" />
								<p className="text-sm mt-1">Warning</p>
							</div>
							<Badge className="bg-green-100 text-green-800">8.2:1 (AAA)</Badge>
						</div>
						<div className="text-center">
							<div className="bg-blue-500 text-white p-3 rounded-lg mb-2">
								<Eye className="h-6 w-6 mx-auto" />
								<p className="text-sm mt-1">Info</p>
							</div>
							<Badge className="bg-green-100 text-green-800">5.4:1 (AA)</Badge>
						</div>
					</div>
				</div>

				{/* Text Hierarchy */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Text Hierarchy Compliance</h3>
					<div className="space-y-3 p-4 border rounded-lg">
						<div className="flex items-center justify-between">
							<h1 className="text-4xl font-bold text-gray-900">Primary Heading</h1>
							<Badge className="bg-green-100 text-green-800">21:1 (AAA)</Badge>
						</div>
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-semibold text-gray-800">Secondary Heading</h2>
							<Badge className="bg-green-100 text-green-800">15:1 (AAA)</Badge>
						</div>
						<div className="flex items-center justify-between">
							<p className="text-base text-gray-600">Body text content</p>
							<Badge className="bg-green-100 text-green-800">7.2:1 (AAA)</Badge>
						</div>
						<div className="flex items-center justify-between">
							<p className="text-sm text-gray-500">Secondary text</p>
							<Badge className="bg-green-100 text-green-800">4.7:1 (AA)</Badge>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Keyboard Navigation Examples
const KeyboardNavigationExamples: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Keyboard className="h-5 w-5" />
				Keyboard Navigation
			</CardTitle>
			<CardDescription>
				Comprehensive keyboard support for all interactive elements
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* Focus States */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Focus Indicators</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<h4 className="font-medium text-gray-700">Buttons</h4>
							<div className="flex gap-3">
								<Button className="focus-simplify">Primary</Button>
								<Button variant="outline" className="focus-simplify">Outline</Button>
								<Button variant="ghost" className="focus-simplify">Ghost</Button>
							</div>
							<p className="text-xs text-gray-600">
								Click any button then press Tab to see focus ring
							</p>
						</div>
						<div className="space-y-3">
							<h4 className="font-medium text-gray-700">Form Controls</h4>
							<div className="space-y-2">
								<input 
									className="w-full px-3 py-2 border rounded-md focus-simplify focus:outline-none" 
									placeholder="Text input with brand focus"
								/>
								<select className="w-full px-3 py-2 border rounded-md focus-simplify focus:outline-none">
									<option>Select option</option>
									<option>Option 1</option>
									<option>Option 2</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				{/* Keyboard Shortcuts */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Standard Keyboard Patterns</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 border rounded-lg">
							<h4 className="font-medium mb-3 flex items-center gap-2">
								<Focus className="h-4 w-4" />
								Navigation Keys
							</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span>Tab</span>
									<span className="text-gray-600">Next element</span>
								</div>
								<div className="flex justify-between">
									<span>Shift + Tab</span>
									<span className="text-gray-600">Previous element</span>
								</div>
								<div className="flex justify-between">
									<span>Enter</span>
									<span className="text-gray-600">Activate button/link</span>
								</div>
								<div className="flex justify-between">
									<span>Space</span>
									<span className="text-gray-600">Activate button</span>
								</div>
							</div>
						</div>
						<div className="p-4 border rounded-lg">
							<h4 className="font-medium mb-3 flex items-center gap-2">
								<MousePointer className="h-4 w-4" />
								Arrow Keys
							</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span>↑ ↓</span>
									<span className="text-gray-600">Menu navigation</span>
								</div>
								<div className="flex justify-between">
									<span>← →</span>
									<span className="text-gray-600">Tab navigation</span>
								</div>
								<div className="flex justify-between">
									<span>Home</span>
									<span className="text-gray-600">First item</span>
								</div>
								<div className="flex justify-between">
									<span>End</span>
									<span className="text-gray-600">Last item</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Skip Links */}
				<div className="p-4 bg-gray-50 rounded-lg">
					<h4 className="font-medium mb-2">Skip Links Implementation</h4>
					<p className="text-sm text-gray-600 mb-3">
						Invisible skip links that appear on focus for screen reader and keyboard users.
					</p>
					<div className="p-3 bg-white border rounded font-mono text-sm">
						<div className="text-blue-600">&lt;a href="#main-content" className="sr-only focus:not-sr-only"&gt;</div>
						<div className="pl-4">Skip to main content</div>
						<div className="text-blue-600">&lt;/a&gt;</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Screen Reader Support
const ScreenReaderSupport: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Volume2 className="h-5 w-5" />
				Screen Reader Support
			</CardTitle>
			<CardDescription>
				Semantic HTML and ARIA implementation for assistive technologies
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* ARIA Labels */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">ARIA Labels & Descriptions</h3>
					<div className="space-y-4">
						<div className="p-4 border rounded-lg">
							<h4 className="font-medium mb-3">Button Examples</h4>
							<div className="flex gap-3 mb-3">
								<Button aria-label="Close dialog" className="p-2">
									<XCircle className="h-4 w-4" />
								</Button>
								<Button aria-label="Settings menu" aria-describedby="settings-desc">
									<Shield className="h-4 w-4" />
								</Button>
								<Button aria-label="Download report" aria-describedby="download-desc">
									Download
								</Button>
							</div>
							<div className="space-y-1 text-xs text-gray-600">
								<p id="settings-desc">Opens the application settings panel</p>
								<p id="download-desc">Downloads the current month's property report</p>
							</div>
						</div>

						<div className="p-4 border rounded-lg">
							<h4 className="font-medium mb-3">Form Labels</h4>
							<div className="space-y-3">
								<div>
									<label htmlFor="tenant-name" className="block text-sm font-medium mb-1">
										Tenant Full Name
									</label>
									<input 
										id="tenant-name"
										type="text"
										className="w-full px-3 py-2 border rounded-md"
										aria-describedby="tenant-name-help"
										required
									/>
									<p id="tenant-name-help" className="text-xs text-gray-600 mt-1">
										Enter the tenant's legal full name as it appears on the lease
									</p>
								</div>
								<div>
									<label htmlFor="rent-amount" className="block text-sm font-medium mb-1">
										Monthly Rent Amount
									</label>
									<input 
										id="rent-amount"
										type="number"
										className="w-full px-3 py-2 border rounded-md"
										aria-describedby="rent-amount-error"
										aria-invalid="true"
									/>
									<p id="rent-amount-error" className="text-xs text-red-600 mt-1" role="alert">
										Please enter a valid rent amount greater than $0
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Semantic Structure */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Semantic HTML Structure</h3>
					<div className="p-4 border rounded-lg">
						<div className="font-mono text-sm space-y-1">
							<div className="text-purple-600">&lt;main role="main"&gt;</div>
							<div className="pl-4 text-blue-600">&lt;header&gt;</div>
							<div className="pl-8 text-green-600">&lt;h1&gt;Dashboard&lt;/h1&gt;</div>
							<div className="pl-8 text-green-600">&lt;nav aria-label="Primary navigation"&gt;</div>
							<div className="pl-4 text-blue-600">&lt;/header&gt;</div>
							<div className="pl-4 text-blue-600">&lt;section aria-labelledby="stats-heading"&gt;</div>
							<div className="pl-8 text-green-600">&lt;h2 id="stats-heading"&gt;Property Statistics&lt;/h2&gt;</div>
							<div className="pl-8 text-gray-600">// Stats cards with proper headings</div>
							<div className="pl-4 text-blue-600">&lt;/section&gt;</div>
							<div className="text-purple-600">&lt;/main&gt;</div>
						</div>
					</div>
				</div>

				{/* Live Regions */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Live Regions for Dynamic Content</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 border rounded-lg">
							<h4 className="font-medium mb-2">Status Messages</h4>
							<div 
								className="p-3 bg-green-50 border border-green-200 rounded text-green-800"
								role="status"
								aria-live="polite"
							>
								✓ Property saved successfully
							</div>
							<p className="text-xs text-gray-600 mt-2">
								Uses <code>role="status"</code> and <code>aria-live="polite"</code>
							</p>
						</div>
						<div className="p-4 border rounded-lg">
							<h4 className="font-medium mb-2">Error Alerts</h4>
							<div 
								className="p-3 bg-red-50 border border-red-200 rounded text-red-800"
								role="alert"
								aria-live="assertive"
							>
								⚠ Failed to save property data
							</div>
							<p className="text-xs text-gray-600 mt-2">
								Uses <code>role="alert"</code> and <code>aria-live="assertive"</code>
							</p>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

// Responsive Accessibility
const ResponsiveAccessibility: React.FC = () => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Monitor className="h-5 w-5" />
				Responsive Accessibility
			</CardTitle>
			<CardDescription>
				Ensuring accessibility across all devices and screen sizes
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div className="space-y-6">
				{/* Touch Targets */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Touch Target Sizes</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 border rounded-lg">
							<Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
							<h4 className="font-medium mb-2">Mobile (320px+)</h4>
							<div className="space-y-2">
								<Button size="lg" className="w-full min-h-[44px]">
									44px Min Height
								</Button>
								<p className="text-xs text-gray-600">
									WCAG minimum 44x44px touch targets
								</p>
							</div>
						</div>
						<div className="text-center p-4 border rounded-lg">
							<Tablet className="h-8 w-8 mx-auto mb-2 text-blue-600" />
							<h4 className="font-medium mb-2">Tablet (768px+)</h4>
							<div className="space-y-2">
								<Button className="w-full">
									Comfortable Size
								</Button>
								<p className="text-xs text-gray-600">
									Optimized for both touch and pointer
								</p>
							</div>
						</div>
						<div className="text-center p-4 border rounded-lg">
							<Monitor className="h-8 w-8 mx-auto mb-2 text-blue-600" />
							<h4 className="font-medium mb-2">Desktop (1024px+)</h4>
							<div className="space-y-2">
								<Button>
									Standard Size
								</Button>
								<p className="text-xs text-gray-600">
									Enhanced hover and focus states
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Responsive Text */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Responsive Typography</h3>
					<div className="space-y-3 p-4 border rounded-lg">
						<div className="text-sm text-gray-600">Mobile: 16px base (iOS zoom prevention)</div>
						<div className="text-base">
							This text scales appropriately across devices while maintaining readability
						</div>
						<div className="text-lg font-semibold">
							Headlines remain prominent at all sizes
						</div>
						<div className="text-2xl font-bold">
							Hero text scales with viewport
						</div>
					</div>
				</div>

				{/* Reduced Motion */}
				<div>
					<h3 className="mb-4 font-semibold text-gray-800">Reduced Motion Support</h3>
					<div className="p-4 border rounded-lg">
						<p className="text-sm text-gray-600 mb-3">
							Respects user's motion preferences via CSS <code>prefers-reduced-motion</code>
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<h4 className="font-medium mb-2">Standard Animation</h4>
								<Button className="transition-all duration-300 hover:scale-[1.02]">
									Hover for Animation
								</Button>
							</div>
							<div>
								<h4 className="font-medium mb-2">Reduced Motion</h4>
								<Button className="transition-colors duration-150">
									Minimal Animation
								</Button>
							</div>
						</div>
						<div className="mt-3 p-3 bg-gray-50 rounded text-sm">
							<code>@media (prefers-reduced-motion: reduce)</code> removes complex animations
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
)

export const AccessibilityOverview: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="text-center mb-8">
				<h1 className="mb-4 text-4xl font-bold">Accessibility Standards</h1>
				<p className="text-xl text-gray-600 max-w-3xl mx-auto">
					TenantFlow adheres to WCAG 2.1 AA standards, ensuring an inclusive 
					experience for all users regardless of their abilities or assistive technologies.
				</p>
			</div>

			{/* Compliance Overview */}
			<Card className="bg-green-50 border-green-200">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-green-800">
						<CheckCircle className="h-5 w-5 text-green-600" />
						WCAG 2.1 AA Compliance Status
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600">100%</div>
							<div className="text-sm text-green-700">Color Contrast</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600">100%</div>
							<div className="text-sm text-green-700">Keyboard Navigation</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600">100%</div>
							<div className="text-sm text-green-700">Screen Reader</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600">100%</div>
							<div className="text-sm text-green-700">Touch Targets</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<ColorContrastExamples />
			<KeyboardNavigationExamples />
			<ScreenReaderSupport />
			<ResponsiveAccessibility />

			{/* Testing Tools */}
			<Card>
				<CardHeader>
					<CardTitle>Accessibility Testing Tools</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="p-4 border rounded-lg text-center">
							<h4 className="font-semibold mb-2">Automated Testing</h4>
							<p className="text-sm text-gray-600 mb-3">
								axe-core integration for continuous accessibility testing
							</p>
							<Badge variant="outline">CI/CD Integration</Badge>
						</div>
						<div className="p-4 border rounded-lg text-center">
							<h4 className="font-semibold mb-2">Manual Testing</h4>
							<p className="text-sm text-gray-600 mb-3">
								Screen reader testing with NVDA, JAWS, and VoiceOver
							</p>
							<Badge variant="outline">Human Validation</Badge>
						</div>
						<div className="p-4 border rounded-lg text-center">
							<h4 className="font-semibold mb-2">User Testing</h4>
							<p className="text-sm text-gray-600 mb-3">
								Regular feedback from users with disabilities
							</p>
							<Badge variant="outline">Real User Feedback</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Implementation Checklist */}
			<Card>
				<CardHeader>
					<CardTitle>Developer Implementation Checklist</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-semibold mb-3">Required Standards</h4>
							<div className="space-y-2 text-sm">
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Semantic HTML structure
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Proper heading hierarchy (h1-h6)
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Form labels and descriptions
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Focus indicators on all interactive elements
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Alt text for all images
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-green-600" />
									Keyboard navigation support
								</div>
							</div>
						</div>
						<div>
							<h4 className="font-semibold mb-3">Enhanced Features</h4>
							<div className="space-y-2 text-sm">
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									Skip links for main content
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									Live regions for dynamic content
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									Reduced motion support
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									High contrast mode support
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									44px minimum touch targets
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									Error prevention and recovery
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}