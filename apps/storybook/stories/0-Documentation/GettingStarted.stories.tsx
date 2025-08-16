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
	BookOpen,
	Palette,
	Code,
	Eye,
	TestTube,
	Zap,
	Target,
	Users,
	Lightbulb,
	CheckCircle,
	ArrowRight,
	Github,
	Play
} from 'lucide-react'

const meta = {
	title: '📚 Documentation/Getting Started',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Complete guide to using TenantFlow Storybook for component development and consolidation.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const GettingStartedDocs: React.FC = () => (
	<div className="mx-auto max-w-6xl space-y-8 p-8">
		{/* Header */}
		<div className="mb-12 space-y-4 text-center">
			<div className="mb-4 flex items-center justify-center gap-3">
				<BookOpen className="h-12 w-12 text-blue-600" />
				<h1 className="text-4xl font-bold">TenantFlow Storybook</h1>
			</div>
			<p className="mx-auto max-w-3xl text-xl text-gray-600">
				Component library and design system for TenantFlow - driving 83%
				code reduction through systematic component consolidation
			</p>
			<div className="flex justify-center gap-4">
				<Badge className="bg-green-100 text-green-800">
					React 19 Ready
				</Badge>
				<Badge className="bg-blue-100 text-blue-800">
					Next.js 15 Compatible
				</Badge>
				<Badge className="bg-purple-100 text-purple-800">
					Turborepo Optimized
				</Badge>
			</div>
		</div>

		{/* Quick Stats */}
		<div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4">
			<Card>
				<CardContent className="pt-6 text-center">
					<div className="mb-2 text-3xl font-bold text-blue-600">
						12+
					</div>
					<div className="text-sm text-gray-600">
						Components Before
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-6 text-center">
					<div className="mb-2 text-3xl font-bold text-green-600">
						2
					</div>
					<div className="text-sm text-gray-600">
						Components After
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-6 text-center">
					<div className="mb-2 text-3xl font-bold text-purple-600">
						83%
					</div>
					<div className="text-sm text-gray-600">Code Reduction</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-6 text-center">
					<div className="mb-2 text-3xl font-bold text-orange-600">
						14
					</div>
					<div className="text-sm text-gray-600">
						Story Categories
					</div>
				</CardContent>
			</Card>
		</div>

		{/* Navigation Guide */}
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Target className="h-6 w-6" />
					Story Navigation Guide
				</CardTitle>
				<CardDescription>
					Explore our organized story structure designed for maximum
					learning and practical application
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
						<div className="mb-2 flex items-center gap-3">
							<BookOpen className="h-5 w-5 text-blue-600" />
							<h3 className="font-semibold">📚 Documentation</h3>
						</div>
						<p className="text-sm text-gray-600">
							Getting started guides and best practices
						</p>
					</div>

					<div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
						<div className="mb-2 flex items-center gap-3">
							<Palette className="h-5 w-5 text-purple-600" />
							<h3 className="font-semibold">🎨 Design System</h3>
						</div>
						<p className="text-sm text-gray-600">
							Colors, typography, spacing, and design tokens
						</p>
					</div>

					<div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
						<div className="mb-2 flex items-center gap-3">
							<Code className="h-5 w-5 text-green-600" />
							<h3 className="font-semibold">🧩 Components</h3>
						</div>
						<p className="text-sm text-gray-600">
							Base UI components with interactive examples
						</p>
					</div>

					<div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
						<div className="mb-2 flex items-center gap-3">
							<Users className="h-5 w-5 text-indigo-600" />
							<h3 className="font-semibold">🏢 Business</h3>
						</div>
						<p className="text-sm text-gray-600">
							Property management specific components
						</p>
					</div>

					<div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
						<div className="mb-2 flex items-center gap-3">
							<Zap className="h-5 w-5 text-yellow-600" />
							<h3 className="font-semibold">🔄 Consolidation</h3>
						</div>
						<p className="text-sm text-gray-600">
							Before/after examples showing code reduction
						</p>
					</div>

					<div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
						<div className="mb-2 flex items-center gap-3">
							<TestTube className="h-5 w-5 text-red-600" />
							<h3 className="font-semibold">🧪 Testing</h3>
						</div>
						<p className="text-sm text-gray-600">
							Interactive testing and accessibility patterns
						</p>
					</div>
				</div>
			</CardContent>
		</Card>

		{/* Key Features */}
		<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lightbulb className="h-6 w-6" />
						Core Features
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start gap-3">
						<CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
						<div>
							<h4 className="font-semibold">
								Interactive Component Testing
							</h4>
							<p className="text-sm text-gray-600">
								Every component includes @storybook/test
								interactions
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
						<div>
							<h4 className="font-semibold">
								API Mocking with MSW
							</h4>
							<p className="text-sm text-gray-600">
								Realistic component behavior with Mock Service
								Worker
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
						<div>
							<h4 className="font-semibold">
								Visual Regression Testing
							</h4>
							<p className="text-sm text-gray-600">
								Chromatic integration for automated visual
								testing
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
						<div>
							<h4 className="font-semibold">
								Accessibility Testing
							</h4>
							<p className="text-sm text-gray-600">
								Built-in axe-playwright accessibility validation
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Target className="h-6 w-6" />
						Business Impact
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start gap-3">
						<ArrowRight className="mt-0.5 h-5 w-5 text-blue-600" />
						<div>
							<h4 className="font-semibold">
								Reduced Development Time
							</h4>
							<p className="text-sm text-gray-600">
								83% less code to write and maintain
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<ArrowRight className="mt-0.5 h-5 w-5 text-blue-600" />
						<div>
							<h4 className="font-semibold">Consistent UI/UX</h4>
							<p className="text-sm text-gray-600">
								Unified design system across all features
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<ArrowRight className="mt-0.5 h-5 w-5 text-blue-600" />
						<div>
							<h4 className="font-semibold">Faster QA Cycles</h4>
							<p className="text-sm text-gray-600">
								Pre-tested components reduce bug reports
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<ArrowRight className="mt-0.5 h-5 w-5 text-blue-600" />
						<div>
							<h4 className="font-semibold">
								Team Collaboration
							</h4>
							<p className="text-sm text-gray-600">
								Shared component library for all developers
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		{/* Quick Actions */}
		<Card>
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
				<CardDescription>
					Jump into the most important sections for your role
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Button
						className="flex h-auto flex-col items-center gap-3 p-6"
						variant="outline"
					>
						<Code className="h-8 w-8" />
						<div className="text-center">
							<div className="font-semibold">For Developers</div>
							<div className="text-sm text-gray-600">
								Explore Components & Testing
							</div>
						</div>
					</Button>

					<Button
						className="flex h-auto flex-col items-center gap-3 p-6"
						variant="outline"
					>
						<Eye className="h-8 w-8" />
						<div className="text-center">
							<div className="font-semibold">For Designers</div>
							<div className="text-sm text-gray-600">
								Review Design System
							</div>
						</div>
					</Button>

					<Button
						className="flex h-auto flex-col items-center gap-3 p-6"
						variant="outline"
					>
						<Zap className="h-8 w-8" />
						<div className="text-center">
							<div className="font-semibold">For Tech Leads</div>
							<div className="text-sm text-gray-600">
								See Consolidation Impact
							</div>
						</div>
					</Button>
				</div>
			</CardContent>
		</Card>

		{/* Development Commands */}
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Github className="h-6 w-6" />
					Development Commands
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<h4 className="mb-3 font-semibold">
							Local Development
						</h4>
						<div className="space-y-2 rounded-lg bg-gray-50 p-4 font-mono text-sm">
							<div>
								<span className="text-blue-600">
									npm run dev
								</span>{' '}
								<span className="text-gray-600">
									# Start Storybook
								</span>
							</div>
							<div>
								<span className="text-blue-600">
									npm run build
								</span>{' '}
								<span className="text-gray-600">
									# Build static
								</span>
							</div>
							<div>
								<span className="text-blue-600">
									npm run test-storybook
								</span>{' '}
								<span className="text-gray-600">
									# Run tests
								</span>
							</div>
						</div>
					</div>
					<div>
						<h4 className="mb-3 font-semibold">Visual Testing</h4>
						<div className="space-y-2 rounded-lg bg-gray-50 p-4 font-mono text-sm">
							<div>
								<span className="text-blue-600">
									npm run chromatic
								</span>{' '}
								<span className="text-gray-600">
									# Visual tests
								</span>
							</div>
							<div>
								<span className="text-blue-600">
									npm run test:a11y
								</span>{' '}
								<span className="text-gray-600">
									# Accessibility
								</span>
							</div>
							<div>
								<span className="text-blue-600">
									npm run setup:chromatic
								</span>{' '}
								<span className="text-gray-600">
									# Setup guide
								</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
)

export const Introduction: Story = {
	render: () => <GettingStartedDocs />,
	parameters: {
		layout: 'fullscreen',
		docs: { disable: true }
	}
}
