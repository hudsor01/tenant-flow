import { motion } from 'framer-motion'
import { Box, Flex, Grid, Container, Section } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	Calculator,
	CheckCircle,
	Clock,
	Shield,
	ArrowRight,
	DollarSign,
	FileText,
	Mail
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Navigation } from '@/components/layout/Navigation'

export default function InvoiceGeneratorLanding() {
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

	const features = [
		{
			icon: Calculator,
			title: 'Professional Templates',
			description: 'Clean, professional invoice designs that make you look established'
		},
		{
			icon: DollarSign,
			title: 'Auto Tax Calculation',
			description: 'Automatic state-specific sales tax calculation for all 50 US states'
		},
		{
			icon: FileText,
			title: 'PDF Generation',
			description: 'Download professional PDFs ready to send to clients instantly'
		},
		{
			icon: Mail,
			title: 'Email Integration',
			description: 'Generate and email invoices directly to your clients'
		},
		{
			icon: Clock,
			title: 'Save Time',
			description: 'Create professional invoices in minutes, not hours'
		},
		{
			icon: Shield,
			title: 'Data Security',
			description: 'Your business and client data is processed securely'
		}
	]

	const benefits = [
		'Professional invoice templates',
		'Automatic tax calculations',
		'Instant PDF downloads',
		'Email integration',
		'Mobile-friendly design',
		'No registration required'
	]

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
								Free Professional Invoice Generator
							</Badge>
							<h1 className="mb-6 text-display text-primary-foreground">
								Create Professional{' '}
								<span className="text-gradient-brand-hero">
									Invoices
								</span>{' '}
								in Minutes
							</h1>
							<p className="mx-auto mb-8 max-w-2xl text-body-large text-secondary-foreground">
								Generate beautiful, professional invoices with automatic tax calculations
								for all 50 US states. Download PDFs instantly or email directly to clients.
							</p>
							<Flex direction={{ initial: "column", sm: "row" }} gap="4" justify="center">
								<Link to="/tools/invoice-generator">
									<Button size="cta" variant="cta" className="group px-8 py-3 cta-glow cta-magnetic text-white">
										Start Creating Invoices
										<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
									Learn More
								</Button>
							</Flex>
						</motion.div>
					</Box>
				</Container>
			</Section>

			{/* Features Section */}
			<Section id="features" className="section-spacing bg-gradient-slate-gentle">
				<Container size="4">
					<motion.div className="text-center" {...fadeInUp}>
						<h2 className="text-heading text-primary-foreground mb-4">
							Everything You Need for Professional Invoicing
						</h2>
						<p className="text-body-large text-secondary-foreground mx-auto mb-12 max-w-2xl">
							Create, customize, and send professional invoices that get you paid faster.
						</p>
					</motion.div>

					<motion.div
						className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
						variants={staggerChildren}
						initial="initial"
						whileInView="animate"
						viewport={{ once: true }}
					>
						{features.map((feature, index) => (
							<motion.div key={index} variants={fadeInUp}>
								<Card className="card-modern bg-gradient-to-br from-card to-card/80 backdrop-blur-sm h-full card-accent-border transition-all duration-300 rounded-xl">
									<CardHeader>
										<div className="badge-accent mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg border">
											<feature.icon className="h-6 w-6" />
										</div>
										<CardTitle className="text-foreground text-xl">
											{feature.title}
										</CardTitle>
										<CardDescription className="text-muted-foreground">
											{feature.description}
										</CardDescription>
									</CardHeader>
								</Card>
							</motion.div>
						))}
					</motion.div>
				</Container>
			</Section>

			{/* Benefits Section */}
			<Section className="section-spacing bg-gradient-accent-subtle">
				<Container size="4">
					<Grid columns={{ initial: "1", lg: "2" }} gap="8" align="center">
						<motion.div {...fadeInUp}>
							<h2 className="text-heading text-foreground mb-6">
								Why Choose Our Invoice Generator?
							</h2>
							<p className="text-body-large text-muted-foreground mb-8">
								Save time and look professional with our comprehensive invoice solution.
								Built specifically for property managers, freelancers, and small businesses.
							</p>

							<motion.ul
								className="space-y-4"
								variants={staggerChildren}
								initial="initial"
								whileInView="animate"
								viewport={{ once: true }}
							>
								{benefits.map((benefit, index) => (
									<motion.li
										key={index}
										variants={fadeInUp}
										className="flex items-center gap-3"
									>
										<CheckCircle className="text-accent h-5 w-5 shrink-0" />
										<span className="text-foreground">{benefit}</span>
									</motion.li>
								))}
							</motion.ul>
						</motion.div>

						<motion.div {...fadeInUp}>
							<Card className="card-modern bg-gradient-to-br from-card to-card/80 backdrop-blur-sm card-accent-border shadow-lg transition-all duration-300 rounded-xl">
								<CardHeader className="text-center">
									<div className="badge-accent mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border">
										<Calculator className="h-8 w-8" />
									</div>
									<CardTitle className="text-foreground text-2xl">
										Start Creating Invoices
									</CardTitle>
									<CardDescription className="text-muted-foreground text-base">
										Professional invoices with automatic tax calculation,
										instant PDF downloads, and email integration.
									</CardDescription>
								</CardHeader>
								<div className="px-6 pb-6">
									<Link to="/tools/invoice-generator">
										<Button size="cta" variant="cta" className="w-full cta-glow cta-magnetic text-white">
											Create Your First Invoice
											<ArrowRight className="ml-2 h-4 w-4" />
										</Button>
									</Link>
								</div>
							</Card>
						</motion.div>
					</Grid>
				</Container>
			</Section>

			{/* CTA Section */}
			<Section className="section-spacing bg-gradient-mesh">
				<Container size="4">
					<Box className="text-center">
						<motion.div {...fadeInUp}>
							<h2 className="text-heading text-foreground mb-4">
								Ready to Create Professional Invoices?
							</h2>
							<p className="text-body-large text-muted-foreground mx-auto mb-8 max-w-2xl">
								Join thousands of property managers and business owners who trust
								TenantFlow for their invoicing needs.
							</p>
							<Flex direction={{ initial: "column", sm: "row" }} gap="4" justify="center">
								<Link to="/tools/invoice-generator">
									<Button size="cta" variant="cta" className="px-8 py-3 cta-glow cta-magnetic text-white">
										Get Started Now
									</Button>
								</Link>
								<Link to="/pricing">
									<Button variant="steel" size="cta" className="px-8 py-3 cta-magnetic">
										View Pricing
									</Button>
								</Link>
							</Flex>
						</motion.div>
					</Box>
				</Container>
			</Section>
		</Box>
	)
}