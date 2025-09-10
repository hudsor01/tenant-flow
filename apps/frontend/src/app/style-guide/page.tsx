'use client'

import { NumberTicker } from '@/components/magicui/number-ticker'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
	ArrowRight,
	Building2,
	DollarSign,
	Download,
	Eye,
	Heart,
	Star,
	TrendingUp,
	Users
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'

export default function StyleGuidePage() {
	return (
		<PageLayout>
			{/* Header */}
			<div className="border-b bg-card rounded-lg mb-8">
				<div className="p-6">
					<h1 className="text-4xl font-bold">
						Style Guide & Testing Framework
					</h1>
					<p className="text-muted-foreground mt-2">
						Testing ground for UI consistency across dashboard (shadcn) and
						marketing (Mixed UI) contexts
					</p>
				</div>
			</div>

			<div className="space-y-12">
				{/* Color System */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Color System</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="p-4 rounded-lg border">
							<div className="w-full h-12 bg-primary rounded mb-2"></div>
							<p className="text-sm font-medium">Primary</p>
							<p className="text-xs text-muted-foreground">Brand color</p>
						</div>
						<div className="p-4 rounded-lg border">
							<div className="w-full h-12 bg-secondary rounded mb-2"></div>
							<p className="text-sm font-medium">Secondary</p>
							<p className="text-xs text-muted-foreground">Supporting color</p>
						</div>
						<div className="p-4 rounded-lg border">
							<div className="w-full h-12 bg-destructive rounded mb-2"></div>
							<p className="text-sm font-medium">Destructive</p>
							<p className="text-xs text-muted-foreground">Error state</p>
						</div>
						<div className="p-4 rounded-lg border">
							<div className="w-full h-12 bg-muted rounded mb-2"></div>
							<p className="text-sm font-medium">Muted</p>
							<p className="text-xs text-muted-foreground">Subtle background</p>
						</div>
					</div>
				</section>

				{/* Button System */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Button System</h2>

					{/* shadcn/ui Buttons */}
					<div className="space-y-4">
						<h3 className="text-xl font-medium">shadcn/ui Components</h3>
						<div className="flex flex-wrap gap-4">
							<Button variant="default">Primary Button</Button>
							<Button variant="secondary">Secondary Button</Button>
							<Button variant="outline">Outline Button</Button>
							<Button variant="ghost">Ghost Button</Button>
							<Button variant="destructive">Destructive Button</Button>
							<Button variant="link">Link Button</Button>
						</div>

						<div className="flex flex-wrap gap-4">
							<Button size="sm">Small</Button>
							<Button size="default">Default</Button>
							<Button size="lg">Large</Button>
							<Button size="icon">
								<Heart className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<Separator className="my-6" />

					{/* Magic UI Buttons */}
					<div className="space-y-4">
						<h3 className="text-xl font-medium">Magic UI Components</h3>
						<div className="flex flex-wrap gap-4">
							<ShimmerButton>Shimmer Effect</ShimmerButton>
							<ShimmerButton className="bg-gradient-to-r from-blue-500 to-purple-600">
								Custom Gradient
							</ShimmerButton>
						</div>
					</div>
				</section>

				{/* Typography System */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Typography</h2>
					<div className="space-y-4">
						<div>
							<h1 className="text-4xl font-bold">Heading 1 - Display</h1>
							<p className="text-sm text-muted-foreground">
								text-4xl font-bold
							</p>
						</div>
						<div>
							<h2 className="text-3xl font-semibold">Heading 2 - Section</h2>
							<p className="text-sm text-muted-foreground">
								text-3xl font-semibold
							</p>
						</div>
						<div>
							<h3 className="text-2xl font-medium">Heading 3 - Subsection</h3>
							<p className="text-sm text-muted-foreground">
								text-2xl font-medium
							</p>
						</div>
						<div>
							<h4 className="text-xl font-medium">Heading 4 - Component</h4>
							<p className="text-sm text-muted-foreground">
								text-xl font-medium
							</p>
						</div>
						<div>
							<p className="text-base">Body text - Regular paragraph content</p>
							<p className="text-sm text-muted-foreground">text-base (16px)</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">
								Secondary text - Captions and metadata
							</p>
							<p className="text-xs text-muted-foreground">
								text-sm text-muted-foreground
							</p>
						</div>
					</div>
				</section>

				{/* Card System */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Card System</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium">
										Total Properties
									</CardTitle>
									<Building2 className="h-4 w-4 text-muted-foreground" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									<NumberTicker value={1234} />
								</div>
								<p className="text-xs text-muted-foreground">
									+12% from last month
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium">
										Active Tenants
									</CardTitle>
									<Users className="h-4 w-4 text-muted-foreground" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									<NumberTicker value={3456} />
								</div>
								<p className="text-xs text-muted-foreground">
									+8% from last month
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium">
										Monthly Revenue
									</CardTitle>
									<DollarSign className="h-4 w-4 text-muted-foreground" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									$<NumberTicker value={87654} />
								</div>
								<p className="text-xs text-muted-foreground">
									+15% from last month
								</p>
							</CardContent>
						</Card>
					</div>

					<Separator className="my-6" />

					{/* Feature Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Card className="card-elevated">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="h-5 w-5 text-primary" />
									Dashboard Analytics
								</CardTitle>
								<CardDescription>
									Real-time insights into your property performance
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Track occupancy rates, rental income, and maintenance costs
									with comprehensive analytics dashboard.
								</p>
								<Button className="w-full">
									View Analytics <ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</CardContent>
						</Card>

						<Card className="card-glass">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Star className="h-5 w-5 text-yellow-500" />
									Marketing Pages
								</CardTitle>
								<CardDescription>
									Polished components with Magic UI integration
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Stripe Elements integration with beautiful animations and
									effects for conversion optimization.
								</p>
								<ShimmerButton className="w-full">
									Get Started <ArrowRight className="ml-2 h-4 w-4" />
								</ShimmerButton>
							</CardContent>
						</Card>
					</div>
				</section>

				{/* Form Elements */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Form Elements</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<Card>
							<CardHeader>
								<CardTitle>Dashboard Forms (shadcn/ui)</CardTitle>
								<CardDescription>
									Standard form components for admin interfaces
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<label className="text-sm font-medium">Email Address</label>
									<Input
										type="email"
										placeholder="user@example.com"
										className="mt-1"
									/>
								</div>
								<div>
									<label className="text-sm font-medium">Password</label>
									<div className="relative mt-1">
										<Input type="password" placeholder="••••••••" />
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="absolute right-0 top-0 h-full px-3"
										>
											<Eye className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<Button className="w-full">Sign In</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Marketing Forms (Enhanced)</CardTitle>
								<CardDescription>
									Forms with enhanced styling and animations
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<label className="form-label">Full Name</label>
									<Input className="form-input" placeholder="John Doe" />
								</div>
								<div>
									<label className="form-label">Company Email</label>
									<Input
										className="form-input"
										type="email"
										placeholder="john@company.com"
									/>
								</div>
								<ShimmerButton className="w-full">
									Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
								</ShimmerButton>
							</CardContent>
						</Card>
					</div>
				</section>

				{/* Badge System */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Badge & Status System</h2>
					<div className="space-y-4">
						<div className="flex flex-wrap gap-2">
							<Badge variant="default">Default</Badge>
							<Badge variant="secondary">Secondary</Badge>
							<Badge variant="outline">Outline</Badge>
							<Badge variant="destructive">Error</Badge>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge className="badge-success">Active</Badge>
							<Badge className="badge-warning">Pending</Badge>
							<Badge className="badge-info">Processing</Badge>
						</div>

						<div className="flex flex-wrap gap-2">
							<div className="badge">New Feature</div>
							<div className="badge badge-success">Verified</div>
							<div className="badge badge-warning">Beta</div>
						</div>
					</div>
				</section>

				{/* Layout Examples */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Layout Patterns</h2>

					{/* Dashboard Layout */}
					<div className="space-y-6">
						<h3 className="text-xl font-medium">Dashboard Layout</h3>
						<div className="dashboard-container rounded-lg border p-4">
							<div className="dashboard-content">
								<div className="flex items-center justify-between mb-4">
									<h4 className="text-lg font-semibold">Properties Overview</h4>
									<Button size="sm">
										<Download className="mr-2 h-4 w-4" />
										Export
									</Button>
								</div>
								<div className="adaptive-layout">
									<div className="card">
										<h5 className="font-medium mb-2">Metric 1</h5>
										<p className="text-2xl font-bold">1,234</p>
									</div>
									<div className="card">
										<h5 className="font-medium mb-2">Metric 2</h5>
										<p className="text-2xl font-bold">5,678</p>
									</div>
									<div className="card">
										<h5 className="font-medium mb-2">Metric 3</h5>
										<p className="text-2xl font-bold">9,012</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<Separator className="my-6" />

					{/* Marketing Layout */}
					<div className="space-y-6">
						<h3 className="text-xl font-medium">Marketing Layout</h3>
						<div className="surface-glow rounded-lg p-8">
							<div className="container text-center">
								<h4 className="text-display text-gradient-primary mb-4">
									Transform Your Property Management
								</h4>
								<p className="text-lg text-muted-foreground mb-8">
									Join thousands of property managers who trust TenantFlow
								</p>
								<div className="flex justify-center gap-4">
									<ShimmerButton>Start Free Trial</ShimmerButton>
									<Button variant="outline" size="lg">
										View Demo
									</Button>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Navigation Components */}
				<section>
					<h2 className="text-3xl font-semibold mb-6">Navigation Components</h2>

					<div className="space-y-6">
						<h3 className="text-xl font-medium">
							Marketing Navigation (nav-link utility)
						</h3>
						<div className="bg-card border rounded-lg p-6">
							<nav className="flex flex-wrap gap-2">
								<a href="#" className="nav-link">
									Features
								</a>
								<a href="#" className="nav-link">
									Pricing
								</a>
								<a href="#" className="nav-link">
									About
								</a>
								<a href="#" className="nav-link">
									Contact
								</a>
								<a href="#" className="nav-link">
									Blog
								</a>
							</nav>
							<p className="text-sm text-muted-foreground mt-4">
								Fixed: nav-link utility now defined with proper hover states and
								accessibility
							</p>
						</div>
					</div>
				</section>

				{/* Testing Notes */}
				<section className="bg-muted/50 rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">
						Testing Framework Notes
					</h2>
					<div className="space-y-2 text-sm">
						<p>
							• This page serves as a visual testing ground for UI consistency
						</p>
						<p>
							• Use Playwright MCP server to capture screenshots for regression
							testing
						</p>
						<p>
							• Compare dashboard (shadcn) vs marketing (Mixed UI) component
							styling
						</p>
						<p>• Test responsive behavior across different breakpoints</p>
						<p>
							• Validate accessibility with keyboard navigation and screen
							readers
						</p>
					</div>
				</section>
			</div>
		</PageLayout>
	)
}
