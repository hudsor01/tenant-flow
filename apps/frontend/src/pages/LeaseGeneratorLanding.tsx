import { motion } from 'framer-motion'
import { Box, Flex, Container, Section } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	FileText,
	Download,
	CheckCircle,
	Star,
	Clock,
	Shield,
	ArrowRight,
	Building,
	DollarSign,
	Users
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Navigation } from '@/components/layout/Navigation'
import StateLeaseLinks from '@/components/lease-generator/StateLeaseLinks'

export default function LeaseGeneratorLanding() {
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6 }
	}

	const staggerChildren = {
		animate: {
			transition: {
				staggerChildren: 0.1
			}
		}
	}

	return (
		<Box className="min-h-screen bg-gradient-steel-deep">
			{/* Navigation */}
			<Navigation context="public" />

			{/* Hero Section */}
			<Section className="relative section-spacing">
				<Container size="4">
					<Box className="text-center">
						<motion.div {...fadeInUp}>
							<Badge className="mb-6 inline-flex items-center rounded-full badge-accent px-4 py-2 text-sm font-medium border">
								<Star className="mr-1 h-4 w-4" />
								100% Free • No Signup Required
							</Badge>
							<h1 className="mb-6 text-display text-primary-foreground">
								Professional{' '}
								<span className="text-gradient-brand-hero">
									Lease
								</span>{' '}
								Generator
							</h1>
							<p className="mx-auto mb-8 max-w-2xl text-body-large text-secondary-foreground">
								Create legally-compliant residential lease
								agreements in minutes. Professional templates,
								instant download, completely free.
							</p>
							<Flex direction={{ initial: "column", sm: "row" }} gap="4" justify="center">
								<Link to="/tools/lease-generator">
									<Button size="cta" variant="cta" className="group px-8 py-3 cta-glow cta-magnetic text-white">
										<FileText className="mr-2 h-4 w-4" />
										Generate Free Lease Now
									</Button>
								</Link>
								<Button
									variant="steel"
									size="cta"
									className="px-8 py-3 cta-magnetic"
									onClick={() => {
										document.getElementById('features')?.scrollIntoView({
											behavior: 'smooth'
										})
									}}
								>
									<Building className="mr-2 h-4 w-4" />
									Learn More
								</Button>
							</Flex>
							<p className="text-gray-400 text-sm mt-6">
								First lease completely free • PDF & Word formats •
								Legally compliant templates
							</p>
						</motion.div>
					</Box>
				</Container>
			</Section>

			{/* How It Works Section */}
			<Section id="features" className="section-spacing bg-gradient-slate-gentle">
				<Container size="4">
					<motion.div {...fadeInUp} className="mb-12 text-center">
						<h2 className="text-heading text-primary-foreground mb-4">
							Generate Your Lease in 3 Simple Steps
						</h2>
						<p className="text-body-large text-secondary-foreground">
							No legal knowledge required • Professional results
							guaranteed
						</p>
					</motion.div>

					<motion.div
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
						className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 md:grid-cols-3"
					>
						<motion.div variants={fadeInUp} className="text-center">
							<div className="badge-accent mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border interactive-accent">
								<FileText className="h-8 w-8" />
							</div>
							<h3 className="text-primary-foreground mb-3 text-xl font-semibold">
								1. Fill Out Form
							</h3>
							<p className="text-secondary-foreground">
								Enter property details, tenant information, and
								lease terms using our guided form
							</p>
						</motion.div>

						<motion.div variants={fadeInUp} className="text-center">
							<div className="badge-accent mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border interactive-accent">
								<Shield className="h-8 w-8" />
							</div>
							<h3 className="text-primary-foreground mb-3 text-xl font-semibold">
								2. Review & Customize
							</h3>
							<p className="text-secondary-foreground">
								Preview your lease with standard legal clauses
								and make any necessary adjustments
							</p>
						</motion.div>

						<motion.div variants={fadeInUp} className="text-center">
							<div className="badge-accent mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border interactive-accent">
								<Download className="h-8 w-8" />
							</div>
							<h3 className="text-primary-foreground mb-3 text-xl font-semibold">
								3. Download & Sign
							</h3>
							<p className="text-secondary-foreground">
								Instantly download your professional lease in
								PDF or Word format, ready for signing
							</p>
						</motion.div>
					</motion.div>

					<motion.div {...fadeInUp} className="text-center">
						<Link to="/tools/lease-generator">
							<Button size="cta" variant="cta" className="px-12 py-3 cta-glow cta-magnetic text-white">
								Start Creating Your Lease
								<ArrowRight className="ml-2 h-5 w-5" />
							</Button>
						</Link>
					</motion.div>
				</Container>
			</Section>

			{/* Features Section */}
			<Section className="section-spacing bg-gradient-accent-subtle">
				<Container size="4">
					<motion.div {...fadeInUp} className="mb-12 text-center">
						<h2 className="text-heading text-foreground mb-4">
							Professional Lease Templates
						</h2>
						<p className="text-body-large text-muted-foreground">
							Built by legal experts, trusted by thousands of
							landlords
						</p>
					</motion.div>

					<motion.div
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
						className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
					>
						<motion.div variants={fadeInUp}>
							<Card className="card-modern bg-gradient-to-br from-card to-card/80 backdrop-blur-sm h-full text-center card-accent-border transition-all duration-300 rounded-xl">
								<CardHeader>
									<div className="badge-accent mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg border">
										<Shield className="h-6 w-6" />
									</div>
									<CardTitle className="text-foreground">Legally Compliant</CardTitle>
									<CardDescription className="text-muted-foreground">
										Standard clauses and legal protections
										included automatically
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>

						<motion.div variants={fadeInUp}>
							<Card className="card-modern bg-gradient-to-br from-card to-card/80 backdrop-blur-sm h-full text-center card-accent-border transition-all duration-300 rounded-xl">
								<CardHeader>
									<div className="badge-accent mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg border">
										<Clock className="h-6 w-6" />
									</div>
									<CardTitle className="text-foreground">5-Minute Setup</CardTitle>
									<CardDescription className="text-muted-foreground">
										Quick guided form gets you a complete
										lease in minutes
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>

						<motion.div variants={fadeInUp}>
							<Card className="card-modern bg-gradient-to-br from-card to-card/80 backdrop-blur-sm h-full text-center card-accent-border transition-all duration-300 rounded-xl">
								<CardHeader>
									<div className="badge-accent mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg border">
										<Download className="h-6 w-6" />
									</div>
									<CardTitle className="text-foreground">Multiple Formats</CardTitle>
									<CardDescription className="text-muted-foreground">
										Download as PDF for signing or Word for
										customization
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>

						<motion.div variants={fadeInUp}>
							<Card className="card-modern bg-gradient-to-br from-card to-card/80 backdrop-blur-sm h-full text-center card-accent-border transition-all duration-300 rounded-xl">
								<CardHeader>
									<div className="badge-accent mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg border">
										<DollarSign className="h-6 w-6" />
									</div>
									<CardTitle className="text-foreground">Completely Free</CardTitle>
									<CardDescription className="text-muted-foreground">
										First lease is free, no hidden fees or
										signup required
									</CardDescription>
								</CardHeader>
							</Card>
						</motion.div>
					</motion.div>
				</Container>
			</Section>

			{/* Testimonials/Social Proof */}
			<Section className="py-20 lg:py-24 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
				<Container size="4">
					<motion.div {...fadeInUp} className="mb-12 text-center">
						<h2 className="text-white mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
							Trusted by Property Owners
						</h2>
						<div className="text-gray-300 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
							<div className="flex items-center gap-2">
								<Users className="text-cyan-400 h-5 w-5" />
								<span>10,000+ Leases Generated</span>
							</div>
							<div className="flex items-center gap-2">
								<Star className="text-cyan-400 h-5 w-5" />
								<span>4.9/5 Rating</span>
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle className="text-cyan-400 h-5 w-5" />
								<span>Legal Expert Approved</span>
							</div>
						</div>
					</motion.div>
				</Container>
			</Section>

			{/* CTA Section */}
			<Section className="py-20 lg:py-24 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800">
				<Container size="4">
					<Box className="text-center">
						<motion.div {...fadeInUp}>
							<h2 className="text-white mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
								Ready to Create Your Professional Lease?
							</h2>
							<p className="text-gray-300 mx-auto mb-8 max-w-2xl text-lg">
								Join thousands of landlords who've created
								professional lease agreements with our free
								generator.
							</p>
							<Flex direction={{ initial: "column", sm: "row" }} gap="4" justify="center">
								<Link to="/tools/lease-generator">
									<Button size="lg" className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
										Generate Free Lease
										<FileText className="ml-2 h-5 w-5" />
									</Button>
								</Link>
								<Link to="/pricing">
									<Button
										variant="outline"
										size="lg"
										className="px-8 py-3 border-gray-400 text-gray-200 hover:bg-gray-800 hover:text-white hover:border-gray-300 transition-all duration-300"
									>
										Full Property Management Platform
										<ArrowRight className="ml-2 h-5 w-5" />
									</Button>
								</Link>
							</Flex>
							<p className="text-gray-400 text-sm mt-6">
								Need to manage multiple properties? Check out our
								full platform with tenant management, payment
								tracking, and more.
							</p>
						</motion.div>
					</Box>
				</Container>
			</Section>

			{/* State-Specific Lease Generators */}
			<Section className="py-16">
				<Container size="4">
					<motion.div {...fadeInUp}>
						<StateLeaseLinks />
					</motion.div>
				</Container>
			</Section>
		</Box>
	)
}
