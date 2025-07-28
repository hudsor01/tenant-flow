import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePostHog } from 'posthog-js/react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Download,
	CheckCircle,
	Star,
	Users,
	Clock,
	Shield,
	// ArrowLeft, // Unused import
	AlertTriangle
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Navigation } from '@/components/layout/Navigation'
import LeaseGeneratorForm from '@/components/lease-generator/LeaseGeneratorForm'
import { useLeaseGenerator } from '@/hooks/useLeaseGenerator'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import type {
	LeaseGeneratorForm as LeaseFormData,
	LeaseOutputFormat
} from '@tenantflow/shared/types/lease-generator'

function LeaseGeneratorContent() {
	const posthog = usePostHog()

	const {
		generateLease,
		isGenerating,
		usageRemaining,
		requiresPayment
	} = useLeaseGenerator({
		onSuccess: () => {
			// Lease generation completed successfully
		}
	})

	// Track page view
	useEffect(() => {
		posthog?.capture('lease_generator_page_viewed', {
			usage_remaining: usageRemaining,
			requires_payment: requiresPayment,
			timestamp: new Date().toISOString()
		})
	}, [posthog, usageRemaining, requiresPayment])

	const handleGenerateLease = async (
		formData: LeaseFormData,
		format: LeaseOutputFormat
	) => {
		generateLease({ formData, format })
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
			{/* Enhanced Navigation */}
			<Navigation context="public" />

			{/* Page Header */}
			<div className="border-b border-gray-600/50 bg-gray-900/50 backdrop-blur-sm">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div>
								<h1 className="text-3xl font-bold text-white">
									Free Lease Generator
								</h1>
								<p className="text-gray-300 text-lg">
									Generate professional lease agreements instantly
								</p>
							</div>
						</div>
						<Badge className="hidden md:flex bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
							<Star className="mr-1 h-4 w-4" />
							Powered by TenantFlow
						</Badge>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid gap-8 lg:grid-cols-12">
					{/* Main Content */}
					<div className="lg:col-span-8">
						<ErrorBoundary
							fallback={() => (
								<Card className="border-red-200">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-red-600">
											<AlertTriangle className="h-5 w-5" />
											Form Unavailable
										</CardTitle>
										<CardDescription>
											The lease generator form is
											experiencing issues. Please try
											refreshing the page.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<Button
											onClick={() =>
												window.location.reload()
											}
											variant="outline"
											className="w-full"
										>
											Refresh Page
										</Button>
									</CardContent>
								</Card>
							)}
						>
							<LeaseGeneratorForm
								onGenerate={handleGenerateLease}
								isGenerating={isGenerating}
								usageRemaining={usageRemaining}
								requiresPayment={requiresPayment}
							/>
						</ErrorBoundary>
					</div>

					{/* Sidebar */}
					<div className="space-y-6 lg:col-span-4">
						{/* Benefits Card */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.2 }}
						>
							<Card className="border-2 border-gray-600 bg-gray-900/60 backdrop-blur-sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-white">
										<CheckCircle className="h-5 w-5 text-cyan-400" />
										Why Use Our Generator?
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										<div className="flex gap-3">
											<Shield className="text-cyan-400 mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium text-white">
													Legally Compliant
												</div>
												<div className="text-gray-300 text-xs">
													Generated with standard
													lease terms and conditions
												</div>
											</div>
										</div>

										<div className="flex gap-3">
											<Clock className="text-cyan-400 mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium text-white">
													Instant Generation
												</div>
												<div className="text-gray-300 text-xs">
													Get your lease agreement in
													seconds, not hours
												</div>
											</div>
										</div>

										<div className="flex gap-3">
											<Download className="text-cyan-400 mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium text-white">
													Multiple Formats
												</div>
												<div className="text-gray-300 text-xs">
													Download as PDF, Word
													document, or both
												</div>
											</div>
										</div>

										<div className="flex gap-3">
											<Users className="text-cyan-400 mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium text-white">
													Multiple Tenants
												</div>
												<div className="text-gray-300 text-xs">
													Support for multiple tenants
													on single lease
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>

						{/* Usage Card */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.3 }}
						>
							<Card className="border-2 border-cyan-500/50 bg-gray-900/60 backdrop-blur-sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-white">
										<CheckCircle className="h-5 w-5 text-cyan-400" />
										Usage
									</CardTitle>
									<CardDescription className="text-gray-300">
										Free lease generation
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
										<div className="mb-2 flex items-center justify-between">
											<span className="font-medium text-white">
												Free Access
											</span>
											<Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
												Active
											</Badge>
										</div>
										<div className="text-2xl font-bold text-white">
											{usageRemaining || 1} remaining
										</div>
										<div className="text-gray-300 text-sm">
											Generate professional lease agreements
										</div>
									</div>

									<div className="border-t border-gray-600 pt-4" />

									<div className="text-center">
										<div className="mb-2 text-sm font-medium text-white">
											Need a full property management
											solution?
										</div>
										<Link to="/pricing">
											<Button variant="outline" size="sm" className="border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white">
												View Pricing Plans
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						</motion.div>

						{/* Features Card */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.4 }}
						>
							<Card className="border-2 border-gray-600 bg-gray-900/60 backdrop-blur-sm">
								<CardHeader>
									<CardTitle className="text-white">What's Included</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2 text-sm">
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">
												Property & tenant information
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">
												Rent amount & payment terms
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">Security deposit terms</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">Pet & smoking policies</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">
												Utility responsibilities
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">Late fee provisions</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">
												Maintenance responsibilities
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-cyan-400" />
											<span className="text-gray-300">Custom additional terms</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>

						{/* Disclaimer */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.5 }}
						>
							<Card className="border-2 border-yellow-500/50 bg-yellow-500/10">
								<CardContent className="pt-6">
									<div className="text-gray-300 text-xs">
										<strong className="text-yellow-400">Legal Disclaimer:</strong> This
										lease agreement is a template and should
										be reviewed by a qualified attorney
										before use. Laws vary by state and
										locality. TenantFlow provides this tool
										for convenience but does not provide
										legal advice.
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function LeaseGenerator() {
	return (
		<ErrorBoundary
			fallback={() => (
				<div className="from-background via-background to-accent/5 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
								<AlertTriangle className="h-6 w-6 text-red-600" />
							</div>
							<CardTitle className="text-red-600">
								Lease Generator Unavailable
							</CardTitle>
							<CardDescription>
								The lease generator is temporarily unavailable.
								Please try again later or contact support.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex gap-2">
								<Button
									onClick={() => window.location.reload()}
									className="flex-1"
									variant="outline"
								>
									Try Again
								</Button>
								<Link to="/lease-generator">
									<Button className="flex-1">Go Back</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		>
			<LeaseGeneratorContent />
		</ErrorBoundary>
	)
}
