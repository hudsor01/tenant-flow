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
import { Separator } from '@/components/ui/separator'
import {
	Download,
	CheckCircle,
	Star,
	Users,
	Clock,
	Shield,
	CreditCard,
	ArrowLeft,
	AlertTriangle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Navigation } from '@/components/layout/Navigation'
import LeaseGeneratorForm from '@/components/lease-generator/LeaseGeneratorForm'
import { useLeaseGenerator } from '@/hooks/useLeaseGenerator'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type {
	LeaseGeneratorForm as LeaseFormData,
	LeaseOutputFormat
} from '@/types/lease-generator'

function LeaseGeneratorContent() {
	const posthog = usePostHog()

	const {
		generateLease,
		isGenerating,
		usageRemaining,
		requiresPayment,
		initiatePayment
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
		<div className="from-background via-background to-accent/5 min-h-screen bg-gradient-to-br">
			{/* Enhanced Navigation */}
			<Navigation variant="public" />
			
			{/* Page Header */}
			<div className="border-b border-border/50 bg-background/50 backdrop-blur-sm">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div>
								<h1 className="text-3xl font-bold">
									Free Lease Generator
								</h1>
								<p className="text-muted-foreground text-lg">
									Generate professional lease agreements instantly
								</p>
							</div>
						</div>
						<Badge variant="secondary" className="hidden md:flex">
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
							fallback={
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
							}
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
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<CheckCircle className="h-5 w-5 text-green-600" />
										Why Use Our Generator?
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										<div className="flex gap-3">
											<Shield className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium">
													Legally Compliant
												</div>
												<div className="text-muted-foreground text-xs">
													Generated with standard
													lease terms and conditions
												</div>
											</div>
										</div>

										<div className="flex gap-3">
											<Clock className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium">
													Instant Generation
												</div>
												<div className="text-muted-foreground text-xs">
													Get your lease agreement in
													seconds, not hours
												</div>
											</div>
										</div>

										<div className="flex gap-3">
											<Download className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium">
													Multiple Formats
												</div>
												<div className="text-muted-foreground text-xs">
													Download as PDF, Word
													document, or both
												</div>
											</div>
										</div>

										<div className="flex gap-3">
											<Users className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
											<div>
												<div className="text-sm font-medium">
													Multiple Tenants
												</div>
												<div className="text-muted-foreground text-xs">
													Support for multiple tenants
													on single lease
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>

						{/* Pricing Card */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.3 }}
						>
							<Card className="border-primary/20">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<CreditCard className="h-5 w-5" />
										Pricing
									</CardTitle>
									<CardDescription>
										Simple, transparent pricing
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="rounded-lg border border-green-200 bg-green-50 p-4">
										<div className="mb-2 flex items-center justify-between">
											<span className="font-medium">
												Free Trial
											</span>
											<Badge variant="secondary">
												Current
											</Badge>
										</div>
										<div className="text-2xl font-bold">
											$0
										</div>
										<div className="text-muted-foreground text-sm">
											Generate 1 lease agreement free
										</div>
									</div>

									<div className="rounded-lg border p-4">
										<div className="mb-2 flex items-center justify-between">
											<span className="font-medium">
												24-Hour Access
											</span>
											<Badge variant="outline">
												Pay-per-use
											</Badge>
										</div>
										<div className="text-2xl font-bold">
											$9.99
										</div>
										<div className="text-muted-foreground mb-3 text-sm">
											Unlimited lease generation for 24
											hours
										</div>

										{requiresPayment && (
											<Button
												onClick={() => {
													posthog?.capture(
														'lease_generator_unlock_clicked',
														{
															timestamp:
																new Date().toISOString()
														}
													)
													initiatePayment()
												}}
												className="w-full"
												size="sm"
											>
												Unlock Unlimited Access
											</Button>
										)}
									</div>

									<Separator />

									<div className="text-center">
										<div className="mb-2 text-sm font-medium">
											Need a full property management
											solution?
										</div>
										<Link to="/pricing">
											<Button variant="outline" size="sm">
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
							<Card>
								<CardHeader>
									<CardTitle>What's Included</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2 text-sm">
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>
												Property & tenant information
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>
												Rent amount & payment terms
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Security deposit terms</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Pet & smoking policies</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>
												Utility responsibilities
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Late fee provisions</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>
												Maintenance responsibilities
											</span>
										</div>
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-600" />
											<span>Custom additional terms</span>
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
							<Card className="border-amber-200">
								<CardContent className="pt-6">
									<div className="text-muted-foreground text-xs">
										<strong>Legal Disclaimer:</strong> This
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
			fallback={
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
			}
		>
			<LeaseGeneratorContent />
		</ErrorBoundary>
	)
}
